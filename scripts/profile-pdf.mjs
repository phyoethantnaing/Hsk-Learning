// Chromium lab measurements, not field INP or a physical-device benchmark.
import fs from "node:fs";
import { chromium } from "@playwright/test";
(async () => {
  const browser = await chromium.launch({
    executablePath:
      process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
  });
  const result = [];
  for (const cpu of [1, 4]) {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    const page = await context.newPage();
    const session = await context.newCDPSession(page);
    await session.send("Emulation.setCPUThrottlingRate", { rate: cpu });
    await page.addInitScript(() => {
      window.metrics = { events: [], tasks: [], cls: 0 };
      new PerformanceObserver((l) => {
        for (const e of l.getEntries())
          window.metrics.events.push({
            name: e.name,
            duration: e.duration,
            processingMs: e.processingEnd - e.processingStart,
            inputDelayMs: e.processingStart - e.startTime,
            interactionId: e.interactionId,
          });
      }).observe({ type: "event", buffered: true, durationThreshold: 16 });
      new PerformanceObserver((l) => {
        for (const e of l.getEntries())
          window.metrics.tasks.push({
            duration: e.duration,
            start: e.startTime,
          });
      }).observe({ type: "longtask", buffered: true });
      new PerformanceObserver((l) => {
        for (const e of l.getEntries())
          if (!e.hadRecentInput) window.metrics.cls += e.value;
      }).observe({ type: "layout-shift", buffered: true });
    });
    for (const doc of ["vocabulary-hsk-1", "hsk-2-textbook"]) {
      const start = performance.now();
      await page.goto(
        `${process.env.PDF_PROFILE_BASE_URL || "http://localhost:4321/Hsk-Learning/"}reader/${doc}/#page=1`,
      );
      await page.waitForFunction(
        () =>
          document
            .querySelector("[data-pdf-status]")
            .textContent.startsWith("Page 1 of"),
        {},
        { timeout: 90000 },
      );
      const openMs = performance.now() - start;
      await page.evaluate(() => {
        window.metrics.events = [];
        window.metrics.tasks = [];
      });
      const interactions = [];
      for (const selector of [
        "[data-pdf-next]",
        "[data-pdf-next]",
        "[data-pdf-prev]",
        "[data-pdf-zoom-in]",
        "[data-pdf-fit]",
      ]) {
        const el = page.locator(selector);
        await el.scrollIntoViewIfNeeded();
        const b = await el.boundingBox();
        const before = performance.now();
        await page.touchscreen.tap(b.x + b.width / 2, b.y + b.height / 2);
        await page.waitForFunction(
          () =>
            document
              .querySelector("[data-pdf-scroll]")
              .getAttribute("aria-busy") === "false",
          {},
          { timeout: 90000 },
        );
        interactions.push({
          control: selector,
          fullRenderMs: Math.round(performance.now() - before),
        });
      }
      await page.waitForTimeout(250);
      result.push({
        cpuThrottle: cpu,
        document: doc,
        openMs: Math.round(openMs),
        interactions,
        ...(await page.evaluate(() => window.metrics)),
      });
    }
    await context.close();
  }
  await browser.close();
  fs.mkdirSync("artifacts/pdf-reader", { recursive: true });
  fs.writeFileSync(
    process.env.PDF_PROFILE_OUTPUT || "artifacts/pdf-reader/performance.json",
    JSON.stringify(result, null, 2),
  );
  console.log(
    result.map((r) => ({
      cpu: r.cpuThrottle,
      doc: r.document,
      eventSamples: r.events.length,
      maxEventMs: Math.max(
        0,
        ...r.events.filter((e) => e.interactionId).map((e) => e.duration),
      ),
      maxHandlerMs: Math.max(0, ...r.events.map((e) => e.processingMs)),
      longTasks: r.tasks.length,
      cls: r.cls,
    })),
  );
})();
