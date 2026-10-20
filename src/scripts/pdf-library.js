import { startReader } from "./pdf-reader.js";
const host = document.querySelector("[data-reader-host]");
if (host && typeof host.showModal === "function") {
  const root = host.querySelector("[data-pdf-reader]");
  let controller,
    opener,
    scrollY = 0,
    title,
    book,
    closing = false;
  function hide() {
    closing = false;
    controller?.dispose();
    controller = null;
    host.close();
    document.body.style.position = "";
    document.body.style.top = "";
    document.body.style.width = "";
    document.documentElement.classList.remove("reader-open");
    document.title = title || document.title;
    window.scrollTo(0, scrollY);
    opener?.focus({ preventScroll: true });
  }
  function show(data, link) {
    closing = false;
    if (host.open) controller?.dispose();
    else {
      scrollY = window.scrollY;
      title = document.title;
      opener = link;
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = "100%";
      document.documentElement.classList.add("reader-open");
      host.showModal();
    }
    book = data;
    host.setAttribute("aria-label", data.title);
    root.dataset.file = data.file;
    root.dataset.fingerprint = data.sha256;
    root.querySelector("[data-pdf-title]").textContent = data.title;
    root.querySelector("[data-pdf-edition]").textContent =
      `HSK ${data.level} · ${data.kind}`;
    root.querySelector("#pdf-page").max = data.pages;
    document.title = `${data.title} · HSK မြန်မာ`;
    controller = startReader(root);
    root.querySelector("[data-pdf-close]").focus({ preventScroll: true });
  }
  document.addEventListener("click", (event) => {
    const link = event.target.closest("a[data-reader-book]");
    if (
      !link ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    )
      return;
    event.preventDefault();
    const data = JSON.parse(link.dataset.readerBook);
    history.pushState({ ...history.state, hskReader: data.id }, "", link.href);
    show(data, link);
  });
  function close() {
    if (closing) return;
    closing = true;
    if (history.state?.hskReader) history.back();
    else hide();
  }
  root.querySelector("[data-pdf-close]").addEventListener("click", (event) => {
    event.preventDefault();
    close();
  });
  host.addEventListener("cancel", (event) => {
    event.preventDefault();
    close();
  });
  window.addEventListener("popstate", () => {
    if (!history.state?.hskReader) {
      if (host.open) hide();
      return;
    }
    const link = [...document.querySelectorAll("[data-reader-book]")].find(
      (a) => JSON.parse(a.dataset.readerBook).id === history.state.hskReader,
    );
    if (link && (!host.open || book?.id !== history.state.hskReader))
      show(JSON.parse(link.dataset.readerBook), link);
  });
  window.addEventListener("pagehide", (event) => {
    if (!event.persisted) controller?.dispose();
  });
}
