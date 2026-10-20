import workerUrl from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?url";
import {
  highlightKey,
  decodeHighlights,
  normalizeRects,
  MAX_HIGHLIGHTS,
} from "../lib/pdf-highlights.mjs";
// Keep the worker and one successfully opened document warm across modal sessions.
let runtimePromise, sharedWorker, cached;
async function getRuntime() {
  let runtime;
  try {
    runtime = await (runtimePromise ||=
      import("pdfjs-dist/legacy/build/pdf.mjs"));
  } catch (error) {
    runtimePromise = null;
    throw error;
  }
  runtime.GlobalWorkerOptions.workerSrc = workerUrl;
  const worker = (sharedWorker ||= new runtime.PDFWorker());
  try {
    await worker.promise;
  } catch (error) {
    if (sharedWorker === worker) {
      sharedWorker = null;
      worker.destroy();
    }
    throw error;
  }
  return runtime;
}
export function startReader(root) {
  const listeners = new AbortController();
  const on = (target, type, fn) =>
    target.addEventListener(type, fn, { signal: listeners.signal });
  let disposed = false,
    openToken = 0,
    watchdog,
    lastActivity = Date.now();
  const phase = (text) => {
    status.textContent = text;
    root.dataset.phase = text;
  };

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
  paper.hidden = true;
  scroll.hidden = false;
  delete root.dataset.canvasPage;
  list.replaceChildren();
  find("selection-help").textContent =
    "Select text on the page, choose a color, then save your highlight.";
  find("count").textContent = "0 saved";
  error.hidden = true;
  root.querySelector("[data-pdf-highlights]").replaceChildren();
  root.querySelector("[data-pdf-text]").replaceChildren();
  scroll.setAttribute("aria-busy", "true");
  scroll.scrollTop = 0;
  find("body").scrollTop = 0;
  on(find("notes"), "click", () =>
    root.querySelector(".reader-marking").scrollIntoView({ block: "start" }),
  );
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
    lastWidth = null;
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
      on(link, "click", () => {
        navigate(mark.page);
        scroll.focus({ preventScroll: true });
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
      on(remove, "click", () => {
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
    const text = selected.toString().trim();
    const rects = normalizeRects(
      [...range.getClientRects()],
      paper.getBoundingClientRect(),
    );
    if (text.length > 4000 || rects.length > 200) {
      clearSelection();
      status.textContent =
        "Select a shorter passage: up to 4,000 characters and 200 text segments per highlight.";
      return;
    }
    if (text && rects.length) {
      selection = { page: rendered, text, rects };
      save.disabled = false;
    }
  }
  on(document, "selectionchange", captureSelection);
  on(save, "click", () => {
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
    scroll.hidden = paper.hidden;
    find("error-message").textContent = message;
    scroll.setAttribute("aria-busy", "false");
    status.textContent =
      "Unable to display this page. Your highlights are preserved.";
  }
  async function renderPage() {
    if (disposed || !pdf) return;
    const current = ++token;
    scroll.hidden = false;
    renderTask?.cancel();
    textTask?.cancel();
    clearSelection();
    controls();
    scroll.setAttribute("aria-busy", "true");
    error.hidden = true;
    phase(`Rendering page ${desired} of ${pageCount}…`);
    lastActivity = Date.now();
    // Let control feedback paint before cached PDF work resumes in microtasks.
    await new Promise((resolve) =>
      requestAnimationFrame(() => requestAnimationFrame(resolve)),
    );
    if (current !== token) return;
    let page, canvas;
    try {
      page = await pdf.getPage(desired);
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
      canvas = document.createElement("canvas");
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
      const text = document.createElement("div");
      text.className = "textLayer";
      text.dataset.pdfText = "";
      text.setAttribute("role", "document");
      text.setAttribute("aria-label", `Page ${desired} text`);
      text.lang = "zh-Hans";
      text.style.setProperty("--total-scale-factor", String(scale));
      text.style.setProperty("--scale-round-x", "1px");
      text.style.setProperty("--scale-round-y", "1px");
      for (const old of paper.querySelectorAll("canvas")) {
        old.width = 0;
        old.height = 0;
      }
      paper.replaceChildren(canvas, find("highlights"), text);
      paper.style.width = `${viewport.width}px`;
      paper.style.height = `${viewport.height}px`;
      paper.hidden = false;
      rendered = desired;
      paintHighlights();
      root.dataset.canvasPage = String(rendered);
      phase(`Page ${rendered} of ${pageCount}. Preparing text selection…`);
      lastActivity = Date.now();
      // Paint the actual page before extracting or laying out selectable text.
      await new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      );
      if (current !== token) return;
      const content = await page.getTextContent();
      if (current !== token) return;
      // Bounded text batches give touch input and painting a turn between work.
      // PDF.js accepts streamed content and preserves marked-content state.
      let offset = 0,
        canceled = false;
      const textChunks = new ReadableStream({
        async pull(controller) {
          await new Promise((resolve) => setTimeout(resolve, 0));
          if (canceled) return;
          if (current !== token || offset >= content.items.length) {
            controller.close();
            return;
          }
          controller.enqueue({
            ...content,
            items: content.items.slice(offset, offset + 60),
          });
          offset += 60;
        },
        cancel() {
          canceled = true;
        },
      });
      textTask = new runtime.TextLayer({
        textContentSource: textChunks,
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
      history.replaceState(history.state, "", `#page=${rendered}`);
    } catch (err) {
      if (
        current === token &&
        err?.name !== "RenderingCancelledException" &&
        err?.name !== "AbortException"
      )
        showError(
          "The page could not be rendered. Check your connection and try again.",
        );
    } finally {
      if (canvas && !paper.contains(canvas)) {
        canvas.width = 0;
        canvas.height = 0;
      }
      if (current !== token && page !== lastRenderedPage) page?.cleanup();
    }
  }
  function navigate(page) {
    if (!ready) return;
    desired = Math.max(1, Math.min(pageCount, Math.trunc(page) || 1));
    scroll.scrollLeft = 0;
    find("body").scrollTop = 0;
    renderPage();
  }
  on(previous, "click", () => navigate(desired - 1));
  on(next, "click", () => navigate(desired + 1));
  on(pageForm, "submit", (event) => {
    event.preventDefault();
    if (input.checkValidity()) navigate(Number(input.value));
  });
  function setZoom(value) {
    zoom = Math.max(0.75, Math.min(3, value));
    renderPage();
  }
  on(zoomIn, "click", () => setZoom(+(zoom + 0.25).toFixed(2)));
  on(zoomOut, "click", () => setZoom(+(zoom - 0.25).toFixed(2)));
  on(fit, "click", () => setZoom(1));
  on(find("retry"), "click", () => {
    // A failed module/worker fetch can be cached by the browser module loader.
    if (!runtime && root.dataset.initializationFailed === "true")
      location.reload();
    else if (pdf) renderPage();
    else open();
  });
  on(window, "hashchange", () => {
    const page = Number(
      new URLSearchParams(location.hash.slice(1)).get("page"),
    );
    if (page && page !== desired) navigate(page);
  });
  on(window, "storage", (event) => {
    if (event.key === key || event.key === null) {
      readSaved();
      renderList();
      paintHighlights();
    }
  });
  on(window, "pageshow", (event) => {
    if (event.persisted) {
      readSaved();
      renderList();
      paintHighlights();
    }
  });
  const observer = new ResizeObserver((entries) => {
    if (scroll.hidden) return;
    const width = entries[0].contentRect.width;
    if (lastWidth === null) {
      lastWidth = width;
      return;
    }
    if (Math.abs(width - lastWidth) < 2) return;
    lastWidth = width;
    clearTimeout(resizing);
    resizing = setTimeout(() => {
      if (ready) renderPage();
    }, 180);
  });
  observer.observe(scroll);
  async function open() {
    const attempt = ++openToken;
    error.hidden = true;
    scroll.hidden = false;
    ready = false;
    controls();
    phase("Initializing reader…");
    scroll.setAttribute("aria-busy", "true");
    lastActivity = Date.now();
    clearInterval(watchdog);
    // Inactivity, not total download time: progressing slow connections remain valid.
    watchdog = setInterval(() => {
      if (disposed || scroll.getAttribute("aria-busy") !== "true") return;
      if (Date.now() - lastActivity < 45000) return;
      ++openToken;
      ++token;
      ready = false;
      renderTask?.cancel();
      textTask?.cancel();
      loading?.destroy();
      if (cached?.loading === loading) cached = null;
      loading = pdf = null;
      root.dataset.initializationFailed = String(!runtime);
      controls();
      showError(
        root.dataset.phase?.startsWith("Rendering")
          ? "Page rendering stopped responding for 45 seconds. Try again or close the reader."
          : "The connection stopped responding for 45 seconds. Check your connection, then try again.",
      );
    }, 1000);
    try {
      // Let the fullscreen shell paint before importing/initializing PDF.js.
      await new Promise((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(resolve)),
      );
      if (disposed || attempt !== openToken) return;
      runtime = await getRuntime();
      if (disposed || attempt !== openToken) return;
      delete root.dataset.initializationFailed;
      phase("Loading PDF…");
      if (cached?.file !== root.dataset.file) {
        const old = cached;
        cached = null;
        await old?.loading.destroy();
        if (disposed || attempt !== openToken) return;
      }
      if (cached) loading = cached.loading;
      else {
        loading = runtime.getDocument({
          url: root.dataset.file,
          worker: sharedWorker,
          cMapUrl: `${root.dataset.assets}cmaps/`,
          cMapPacked: true,
          standardFontDataUrl: `${root.dataset.assets}standard_fonts/`,
          wasmUrl: `${root.dataset.assets}wasm/`,
          iccUrl: `${root.dataset.assets}iccs/`,
          isEvalSupported: false,
          enableXfa: false,
          disableAutoFetch: true,
          disableStream: true,
          // Keep requests small: larger chunks reduced RTTs for HSK 1 but
          // increased bytes and did not consistently improve cold-open time.
          rangeChunkSize: 262144,
        });
        cached = { file: root.dataset.file, loading };
      }
      loading.onProgress = ({ loaded, total }) => {
        if (disposed || attempt !== openToken) return;
        lastActivity = Date.now();
        if (!pdf)
          phase(
            total
              ? `Loading PDF… ${Math.min(100, Math.round((loaded / total) * 100))}%`
              : "Loading PDF…",
          );
      };
      const document = await loading.promise;
      if (disposed || attempt !== openToken) return;
      pdf = document;
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
    } catch (err) {
      if (disposed || attempt !== openToken) return;
      ready = false;
      if (cached?.loading === loading) cached = null;
      loading?.destroy();
      loading = pdf = null;
      controls();
      const name = err?.name;
      root.dataset.initializationFailed = String(!runtime);
      showError(
        !runtime
          ? "Reader resources could not initialize. Check your connection, then retry to reload this reader."
          : name === "MissingPDFException" || err?.status === 404
            ? "This PDF file is unavailable (404). Try again later."
            : name === "InvalidPDFException"
              ? "This file is not a supported PDF, or it is damaged."
              : name === "PasswordException"
                ? "This PDF is password-protected and cannot be opened in this reader."
                : "The PDF could not be loaded. Check your connection and try again.",
      );
    }
  }
  function dispose() {
    if (disposed) return;
    disposed = true;
    ++token;
    ++openToken;
    clearInterval(watchdog);
    clearTimeout(resizing);
    observer.disconnect();
    listeners.abort();
    renderTask?.cancel();
    textTask?.cancel();
    if (!pdf && loading) {
      if (cached?.loading === loading) cached = null;
      loading.destroy();
    }
    // Keep at most one parsed document, but release the page's bitmap immediately.
    for (const canvas of root.querySelectorAll("canvas")) {
      canvas.width = 0;
      canvas.height = 0;
    }
    lastRenderedPage?.cleanup();
    paper.hidden = true;
    clearSelection();
  }
  on(window, "pagehide", (event) => {
    if (!event.persisted) dispose();
  });
  open();
  return { dispose };
}

const root = document.querySelector("[data-pdf-reader]");
if (root && !root.closest("[data-reader-host]")) {
  const close = root.querySelector("[data-pdf-close]");
  let closing = false,
    controller,
    left = false;
  const path = location.pathname;
  const returnPosition = history.state?.hskReaderReturn;
  window.addEventListener("popstate", () => {
    closing = false;
    // Entries created by pushState before a reload may still traverse inside
    // this document. Load the target route instead of leaving a reader at /library/.
    if (location.pathname !== path) {
      left = true;
      controller?.dispose();
      if (location.pathname === new URL(close.href).pathname && returnPosition)
        history.replaceState(
          { ...history.state, hskReaderReturn: returnPosition },
          "",
          location.href,
        );
      location.replace(location.href);
    } else if (left) {
      left = false;
      controller = startReader(root);
    }
  });
  close.addEventListener("click", (event) => {
    // Reloading a modal URL produces a direct reader document. Retain the
    // original library entry instead of pushing another library visit on Close.
    if (!history.state?.hskReader || history.length < 2) return;
    event.preventDefault();
    if (closing) return;
    closing = true;
    history.back();
  });
  window.addEventListener("pageshow", () => {
    closing = false;
  });
  controller = startReader(root);
}
