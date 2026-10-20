// Reproducible Chromium lab trace: UI paint, first canvas, requests, events and tasks.
// Use a range-capable static server; Astro preview does not advertise byte ranges.
// This measures a lab session, not field INP or physical iPhone performance.
import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const base =
  process.env.PDF_PROFILE_BASE_URL || "http://localhost:4321/Hsk-Learning/";
const output =
  process.env.PDF_PROFILE_OUTPUT || "artifacts/fullscreen-reader/opening.json";
const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
});
const results = [];
for (const slow of [false, true]) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  const session = await context.newCDPSession(page);
  await session.send("Network.enable");
  if (slow)
    await session.send("Network.emulateNetworkConditions", {
      offline: false,
      latency: 100,
      downloadThroughput: 750000,
      uploadThroughput: 100000,
    });
  await page.addInitScript(() => {
    window.readerMetrics = { tasks: [], events: [] };
    new PerformanceObserver((list) => {
      for (const e of list.getEntries())
        window.readerMetrics.tasks.push({ start: e.startTime, ms: e.duration });
    }).observe({ type: "longtask", buffered: true });
    new PerformanceObserver((list) => {
      for (const e of list.getEntries())
        if (e.interactionId)
          window.readerMetrics.events.push({
            start: e.startTime,
            ms: e.duration,
            handlerMs: e.processingEnd - e.processingStart,
          });
    }).observe({ type: "event", buffered: true, durationThreshold: 16 });
    document.addEventListener(
      "click",
      (e) => {
        if (!e.target.closest("[data-reader-book]")) return;
        window.readerTap = performance.now();
        window.readerUi = null;
        requestAnimationFrame(() =>
          requestAnimationFrame(() => {
            if (document.querySelector("[data-reader-host]")?.open)
              window.readerUi = performance.now() - window.readerTap;
          }),
        );
      },
      true,
    );
  });
  await page.goto(new URL("library/", base).href);
  for (const id of [
    "hsk-1-textbook",
    "hsk-2-textbook",
    "hsk-2-textbook",
    "vocabulary-hsk-1",
  ]) {
    const before = await page.evaluate(() => performance.now());
    await page.locator(`a[href$='/reader/${id}/']`).click();
    await page.waitForFunction(
      () => document.querySelector("[data-pdf-reader]")?.dataset.canvasPage,
      null,
      { timeout: 120000 },
    );
    const firstCanvas = await page.evaluate(
      () => performance.now() - window.readerTap,
    );
    await page.waitForFunction(
      () =>
        document
          .querySelector("[data-pdf-scroll]")
          ?.getAttribute("aria-busy") === "false",
      null,
      { timeout: 120000 },
    );
    const row = await page.evaluate(
      ({ id, slow, before, firstCanvas }) => ({
        id,
        slow,
        uiPaintMs: window.readerUi,
        firstCanvasMs: firstCanvas,
        readyMs: performance.now() - window.readerTap,
        requests: performance
          .getEntriesByType("resource")
          .filter((e) => e.startTime >= before && e.name.includes(".pdf"))
          .map((e) => ({ url: e.name, bytes: e.transferSize, ms: e.duration })),
        longTasks: window.readerMetrics.tasks.filter((t) => t.start >= before),
        events: window.readerMetrics.events.filter((e) => e.start >= before),
      }),
      { id, slow, before, firstCanvas },
    );
    results.push(row);
    console.log({
      id,
      slow,
      uiMs: Math.round(row.uiPaintMs),
      canvasMs: Math.round(firstCanvas),
      requests: row.requests.length,
      bytes: row.requests.reduce((n, r) => n + r.bytes, 0),
    });
    await page.locator("[data-pdf-close]").click();
    await page.waitForFunction(
      () => !document.querySelector("[data-reader-host]").open,
    );
  }
  await context.close();
}
await browser.close();
await mkdir(output.slice(0, output.lastIndexOf("/")), { recursive: true });
await writeFile(output, JSON.stringify(results, null, 2));
