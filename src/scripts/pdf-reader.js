import workerUrl from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?url";
import {
  highlightKey,
  decodeHighlights,
  normalizeRects,
  MAX_HIGHLIGHTS,
} from "../lib/pdf-highlights.mjs";
const root = document.querySelector("[data-pdf-reader]");
if (root) startReader(root);
async function startReader(root) {
  const find = (name) => root.querySelector(`[data-pdf-${name}]`);
  const previous = find("prev"),
    next = find("next"),
    fit = find("fit");
  const zoomIn = find("zoom-in"),
    zoomOut = find("zoom-out");
  const pageForm = find("page-form"),
    input = pageForm.querySelector("input");
  const go = pageForm.querySelector("button"),
    scroll = find("scroll");
  const paper = find("paper"),
    status = find("status"),
    error = find("error");
  const save = find("save"),
    color = find("color"),
    list = find("list");
  const key = highlightKey(root.dataset.fingerprint);
  const positionKey = `hsk-mm-pdf-position-v1:${root.dataset.fingerprint}`;
  let pdf,
    loading,
    runtime,
    pageCount = Number(input.max),
    desired = 1,
    rendered = 0;
  let lastRenderedPage;
  let zoom = 1,
    token = 0,
    renderTask,
    textTask,
    selection,
    ready = false;
  let highlights = [],
    rawSaved = null,
    memoryOnly = false,
    resizing,
    lastWidth = 0;
  function storageMessage(text) {
    find("storage").hidden = !text;
    find("storage").textContent = text;
  }
  function readSaved() {
    try {
      const raw = localStorage.getItem(key);
      // Preserve this session's work after a failed write until external data changes.
      if (memoryOnly && raw === rawSaved) return;
      highlights = decodeHighlights(raw, pageCount);
      rawSaved = raw;
      memoryOnly = false;
    } catch {
      storageMessage(
        "Saved highlights could not be read. New highlights will remain available in this session; existing learning progress is unchanged.",
      );
    }
  }
  function persist() {
    try {
      const raw = JSON.stringify({ version: 1, items: highlights });
      localStorage.setItem(key, raw);
      rawSaved = raw;
      memoryOnly = false;
      storageMessage("");
    } catch {
      memoryOnly = true;
      storageMessage(
        "Browser storage is unavailable or full. Your highlights are visible for this session but may not survive a reload.",
      );
    }
  }
  function controls() {
    previous.disabled = !ready || desired <= 1;
    next.disabled = !ready || desired >= pageCount;
    for (const control of [input, go, fit]) control.disabled = !ready;
    zoomIn.disabled = !ready || zoom >= 3;
    zoomOut.disabled = !ready || zoom <= 0.75;
    input.value = String(desired);
    input.max = String(pageCount);
    find("total").textContent = `of ${pageCount}`;
    find("zoom").textContent =
      zoom === 1 ? "100%" : `${Math.round(zoom * 100)}%`;
  }
  function paintHighlights() {
    const layer = find("highlights");
    layer.replaceChildren();
    for (const mark of highlights.filter((item) => item.page === rendered)) {
      for (const [x, y, w, h] of mark.rects) {
        const rect = document.createElement("span");
        rect.className = "reader-mark";
        rect.dataset.color = mark.color;
        Object.assign(rect.style, {
          left: `${x * 100}%`,
          top: `${y * 100}%`,
          width: `${w * 100}%`,
          height: `${h * 100}%`,
        });
        layer.append(rect);
      }
    }
  }
  function renderList() {
    list.replaceChildren();
    find("count").textContent = `${highlights.length} saved`;
    find("empty").hidden = highlights.length > 0;
    for (const mark of highlights) {
      const li = document.createElement("li"),
        link = document.createElement("button");
      link.type = "button";
      link.className = "reader-highlight-link";
      link.dataset.highlightId = mark.id;
      const label = document.createElement("span");
      label.textContent = `Page ${mark.page} · ${mark.color}`;
      const quote = document.createElement("q");
      quote.textContent = mark.text;
      link.append(label, quote);
      link.addEventListener("click", () => {
        navigate(mark.page);
        scroll.scrollIntoView({ block: "start" });
      });
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "icon-button";
      remove.setAttribute(
        "aria-label",
        `Delete highlight on page ${mark.page}: ${mark.text.slice(0, 40)}`,
      );
      // Reuse the original icon already rendered by Astro; no unsafe HTML strings.
      const icon = root.querySelector("[data-pdf-remove-icon] .icon");
      if (icon) remove.append(icon.cloneNode(true));
      else remove.textContent = "×";
      remove.addEventListener("click", () => {
        readSaved();
        highlights = highlights.filter((item) => item.id !== mark.id);
        persist();
        renderList();
        paintHighlights();
        status.textContent = "Highlight removed.";
        (list.querySelector("button") || color).focus();
      });
      li.append(link, remove);
      list.append(li);
    }
  }
  function clearSelection() {
    selection = null;
    save.disabled = true;
  }
  function captureSelection() {
    const selected = window.getSelection();
    if (
      !selected ||
      selected.isCollapsed ||
      !selected.rangeCount ||
      rendered !== desired ||
      scroll.getAttribute("aria-busy") === "true"
    )
      return;
    const range = selected.getRangeAt(0),
      layer = find("text");
    if (
      !layer.contains(range.startContainer) ||
      !layer.contains(range.endContainer)
    )
      return;
    const text = selected.toString().trim().slice(0, 4000);
    const rects = normalizeRects(
      [...range.getClientRects()],
      paper.getBoundingClientRect(),
    );
    if (text && rects.length) {
      selection = { page: rendered, text, rects };
      save.disabled = false;
    }
  }
  document.addEventListener("selectionchange", captureSelection);
  save.addEventListener("click", () => {
    if (!selection || selection.page !== rendered) return;
    readSaved();
    if (highlights.length >= MAX_HIGHLIGHTS) {
      storageMessage(
        "This book has reached 1,000 highlights. Remove an existing highlight before adding another.",
      );
      return;
    }
    const mark = { ...selection, color: color.value, id: crypto.randomUUID() };
    highlights.push(mark);
    persist();
    renderList();
    paintHighlights();
    clearSelection();
    window.getSelection()?.removeAllRanges();
    status.textContent = "Highlight added.";
  });
  function showError(message) {
    error.hidden = false;
    find("error-message").textContent = message;
    scroll.setAttribute("aria-busy", "false");
    status.textContent =
      "Unable to display this page. Your highlights are preserved.";
  }
  async function renderPage() {
    const current = ++token;
    renderTask?.cancel();
    textTask?.cancel();
    clearSelection();
    controls();
    scroll.setAttribute("aria-busy", "true");
    error.hidden = true;
    status.textContent = `Loading page ${desired} of ${pageCount}…`;
    try {
      const page = await pdf.getPage(desired);
      if (current !== token) return;
      const base = page.getViewport({ scale: 1 });
      const width = Math.max(
        180,
        scroll.clientWidth - (innerWidth <= 600 ? 14 : 26),
      );
      const scale = (width / base.width) * zoom,
        viewport = page.getViewport({ scale });
      // A single visible canvas, capped at six million pixels and 2× density.
      const density = Math.min(
        devicePixelRatio || 1,
        2,
        Math.sqrt(6000000 / (viewport.width * viewport.height)),
      );
      const canvas = document.createElement("canvas");
      canvas.dataset.pdfCanvas = "";
      canvas.setAttribute("aria-hidden", "true");
      canvas.width = Math.ceil(viewport.width * density);
      canvas.height = Math.ceil(viewport.height * density);
      renderTask = page.render({
        canvas,
        canvasContext: canvas.getContext("2d"),
        viewport,
        transform: density === 1 ? undefined : [density, 0, 0, density, 0, 0],
        annotationMode: runtime.AnnotationMode.DISABLE,
      });
      await renderTask.promise;
      if (current !== token) return;
      const content = await page.getTextContent();
      if (current !== token) return;
      const text = document.createElement("div");
      text.className = "textLayer";
      text.dataset.pdfText = "";
      text.setAttribute("role", "document");
      text.setAttribute("aria-label", `Page ${desired} text`);
      text.lang = "zh-Hans";
      text.style.setProperty("--total-scale-factor", String(scale));
      text.style.setProperty("--scale-round-x", "1px");
      text.style.setProperty("--scale-round-y", "1px");
      paper.replaceChildren(canvas, find("highlights"), text);
      paper.style.width = `${viewport.width}px`;
      paper.style.height = `${viewport.height}px`;
      paper.hidden = false;
      textTask = new runtime.TextLayer({
        textContentSource: content,
        container: text,
        viewport,
      });
      await textTask.render();
      if (current !== token) return;
      // Older browsers can ignore PDF.js's CSS round() sizing and use explicit geometry.
      text.style.width = `${viewport.width}px`;
      text.style.height = `${viewport.height}px`;
      if (lastRenderedPage && lastRenderedPage !== page)
        lastRenderedPage.cleanup();
      lastRenderedPage = page;
      rendered = desired;
      paintHighlights();
      scroll.setAttribute("aria-busy", "false");
      const hasText = content.items.some((item) => item.str?.trim());
      find("selection-help").textContent = hasText
        ? "Select text on the page, choose a color, then save your highlight."
        : "This page is an image scan with no selectable text. Text highlights are unavailable on this page.";
      if (!hasText) {
        canvas.removeAttribute("aria-hidden");
        canvas.setAttribute("role", "img");
        canvas.setAttribute(
          "aria-label",
          `Scanned PDF page ${rendered}. No text transcript is available in the original.`,
        );
      }
      status.textContent = `Page ${rendered} of ${pageCount}. ${hasText ? "Text selection available." : "Image-only page."}`;
      try {
        localStorage.setItem(positionKey, String(rendered));
      } catch {
        /* Reading never depends on storage. */
      }
      history.replaceState(null, "", `#page=${rendered}`);
    } catch (err) {
      if (
        current === token &&
        err?.name !== "RenderingCancelledException" &&
        err?.name !== "AbortException"
      )
        showError(
          "The page could not be rendered. Check your connection and try again.",
        );
    }
  }
  function navigate(page) {
    if (!ready) return;
    desired = Math.max(1, Math.min(pageCount, Math.trunc(page) || 1));
    scroll.scrollLeft = 0;
    renderPage();
  }
  previous.addEventListener("click", () => navigate(desired - 1));
  next.addEventListener("click", () => navigate(desired + 1));
  pageForm.addEventListener("submit", (event) => {
    event.preventDefault();
    if (input.checkValidity()) navigate(Number(input.value));
  });
  function setZoom(value) {
    zoom = Math.max(0.75, Math.min(3, value));
    renderPage();
  }
  zoomIn.addEventListener("click", () => setZoom(+(zoom + 0.25).toFixed(2)));
  zoomOut.addEventListener("click", () => setZoom(+(zoom - 0.25).toFixed(2)));
  fit.addEventListener("click", () => setZoom(1));
  find("retry").addEventListener("click", () => (pdf ? renderPage() : open()));
  window.addEventListener("hashchange", () => {
    const page = Number(
      new URLSearchParams(location.hash.slice(1)).get("page"),
    );
    if (page && page !== desired) navigate(page);
  });
  window.addEventListener("storage", (event) => {
    if (event.key === key || event.key === null) {
      readSaved();
      renderList();
      paintHighlights();
    }
  });
  window.addEventListener("pageshow", (event) => {
    if (event.persisted) {
      readSaved();
      renderList();
      paintHighlights();
    }
  });
  new ResizeObserver((entries) => {
    const width = entries[0].contentRect.width;
    if (Math.abs(width - lastWidth) < 2) return;
    lastWidth = width;
    clearTimeout(resizing);
    resizing = setTimeout(() => {
      if (ready) renderPage();
    }, 180);
  }).observe(scroll);
  async function open() {
    error.hidden = true;
    status.textContent = "Opening your book…";
    scroll.setAttribute("aria-busy", "true");
    try {
      await loading?.destroy();
      runtime ||= await import("pdfjs-dist/legacy/build/pdf.mjs");
      runtime.GlobalWorkerOptions.workerSrc = workerUrl;
      loading = runtime.getDocument({
        url: root.dataset.file,
        cMapUrl: `${root.dataset.assets}cmaps/`,
        cMapPacked: true,
        standardFontDataUrl: `${root.dataset.assets}standard_fonts/`,
        wasmUrl: `${root.dataset.assets}wasm/`,
        iccUrl: `${root.dataset.assets}iccs/`,
        isEvalSupported: false,
        enableXfa: false,
        disableAutoFetch: true,
        disableStream: true,
        rangeChunkSize: 262144,
      });
      loading.onProgress = ({ loaded, total }) => {
        if (!pdf)
          status.textContent = total
            ? `Opening your book… ${Math.min(100, Math.round((loaded / total) * 100))}%`
            : "Opening your book…";
      };
      pdf = await loading.promise;
      pageCount = pdf.numPages;
      ready = true;
      let stored = 1;
      try {
        stored = Number(localStorage.getItem(positionKey)) || 1;
      } catch {
        /* Optional. */
      }
      desired = Math.max(
        1,
        Math.min(
          pageCount,
          Math.trunc(
            Number(new URLSearchParams(location.hash.slice(1)).get("page")) ||
              stored,
          ),
        ),
      );
      readSaved();
      renderList();
      await renderPage();
    } catch {
      ready = false;
      controls();
      showError(
        "The PDF could not be loaded. Check your connection or try a newer browser, then try again.",
      );
    }
  }
  window.addEventListener("pagehide", (event) => {
    if (!event.persisted) {
      ++token;
      renderTask?.cancel();
      textTask?.cancel();
      loading?.destroy();
    }
  });
  await open();
}
