// Lab diagnostics, not a field INP or a guarantee for physical iOS devices.
// Keep the production build stable and run without other browser workloads.
import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
const base =
  process.env.PROFILE_BASE_URL || "http://localhost:4321/Hsk-Learning/";
const stage = process.env.PROFILE_STAGE || "after";
const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
});
const reports = [];
for (const rate of [1, 4])
  for (let run = 1; run <= 3; run++) {
    const context = await browser.newContext({
      viewport: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
    });
    await context.addInitScript(() => {
      window.__profile = { events: [], longTasks: [], shifts: [], clicks: 0 };
      for (const type of ["event", "longtask", "layout-shift"])
        try {
          new PerformanceObserver((list) => {
            for (const e of list.getEntries()) {
              if (type === "event" && e.interactionId)
                __profile.events.push({
                  name: e.name,
                  duration: e.duration,
                  handlerMs: e.processingEnd - e.processingStart,
                  inputDelayMs: e.processingStart - e.startTime,
                });
              if (type === "longtask")
                __profile.longTasks.push({
                  start: e.startTime,
                  duration: e.duration,
                });
              if (type === "layout-shift" && !e.hadRecentInput)
                __profile.shifts.push(e.value);
            }
          }).observe({
            type,
            buffered: true,
            ...(type === "event" ? { durationThreshold: 16 } : {}),
          });
        } catch {}
      document.addEventListener("click", () => __profile.clicks++);
      Object.defineProperty(window, "speechSynthesis", {
        value: {
          getVoices: () => [],
          cancel() {},
          speak() {},
        },
      });
    });
    const page = await context.newPage();
    const cdp = await context.newCDPSession(page);
    await cdp.send("Emulation.setCPUThrottlingRate", { rate });
    async function tap(selector) {
      const el = page.locator(selector).first();
      await el.scrollIntoViewIfNeeded();
      const box = await el.boundingBox();
      await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
    }
    for (const scenario of ["learning", "flashcards", "search", "appearance"]) {
      const route = {
        learning: "hsk1/hsk1-0001/",
        flashcards: "hsk1/lesson/1/flashcards/",
        search: "search/",
        appearance: "",
      }[scenario];
      await page.goto(new URL(route, base).href);
      await page.evaluate(() => document.fonts.ready);
      await page.waitForTimeout(100);
      const start = await page.evaluate(() => performance.now());
      if (scenario === "learning") {
        for (let n = 0; n < 4; n++) await tap("[data-learned-id]");
        await tap("[data-speak]");
        await tap("[data-speak]");
        await tap(".script-toggle");
      }
      if (scenario === "flashcards") {
        for (let n = 0; n < 5; n++) {
          await tap("[data-card]:not([hidden]) [data-flip]");
          await tap("[data-known=true]");
        }
      }
      if (scenario === "search") {
        await page.locator("#q").pressSequentially("a", { delay: 20 });
        await page.waitForFunction(() =>
          document.querySelector("[data-results] a"),
        );
        await page.locator("#q").pressSequentially("i4", { delay: 20 });
        await page.waitForFunction(
          () => document.querySelectorAll("[data-results] a").length === 1,
        );
        await tap("[data-search-clear]");
        await page.locator("#q").fill("ချစ်");
        await page.waitForFunction(() =>
          document.querySelector("[data-results] a"),
        );
      }
      if (scenario === "appearance") {
        await tap("[data-appearance-open]");
        await tap("[data-theme-choice][value=dark] + svg");
        await tap("[data-theme-choice][value=light] + svg");
        await tap("[data-appearance-close]");
      }
      await page.waitForTimeout(150);
      const scroll = await page.evaluate(
        () =>
          new Promise((resolve) => {
            const gaps = [];
            let previous = performance.now(),
              i = 0;
            function frame(now) {
              gaps.push(now - previous);
              previous = now;
              window.scrollBy(0, 30);
              if (++i < 30) requestAnimationFrame(frame);
              else
                resolve({
                  frames: gaps.length,
                  p95FrameGapMs: gaps.sort((a, b) => a - b)[
                    Math.floor(gaps.length * 0.95)
                  ],
                  framesOver33ms: gaps.filter((x) => x > 33.3).length,
                });
            }
            requestAnimationFrame(frame);
          }),
      );
      reports.push(
        await page.evaluate(
          ({ rate, run, scenario, start, scroll }) => {
            const nav = performance.getEntriesByType("navigation")[0];
            const p = __profile;
            return {
              rate,
              run,
              scenario,
              eventCount: p.events.length,
              worstEventMs: Math.max(0, ...p.events.map((x) => x.duration)),
              maxHandlerMs: Math.max(0, ...p.events.map((x) => x.handlerMs)),
              maxInputDelayMs: Math.max(
                0,
                ...p.events.map((x) => x.inputDelayMs),
              ),
              startupLongTasks: p.longTasks.filter((x) => x.start < start),
              interactionLongTasks: p.longTasks.filter((x) => x.start >= start),
              blockingMs: p.longTasks.reduce(
                (n, x) => n + Math.max(0, x.duration - 50),
                0,
              ),
              cls: p.shifts.reduce((a, b) => a + b, 0),
              domContentLoadedMs: nav.domContentLoadedEventEnd,
              clicks: p.clicks,
              scroll,
              events: p.events,
            };
          },
          { rate, run, scenario, start, scroll },
        ),
      );
    }
    await context.close();
  }
await browser.close();
await mkdir("artifacts/touch-gold", { recursive: true });
await writeFile(
  `artifacts/touch-gold/performance-${stage}.json`,
  JSON.stringify(
    {
      stage,
      method:
        "Chromium synthetic touch; 3 runs at 1x and 4x CPU; Event Timing >=16ms, lab worst-event proxy, not field INP; synthetic scroll rAF gaps include protocol/VM scheduling.",
      reports,
    },
    null,
    2,
  ),
);
console.log(
  JSON.stringify(
    reports.map(
      ({
        rate,
        run,
        scenario,
        worstEventMs,
        maxHandlerMs,
        blockingMs,
        cls,
      }) => ({
        rate,
        run,
        scenario,
        worstEventMs,
        maxHandlerMs,
        blockingMs,
        cls,
      }),
    ),
    null,
    2,
  ),
);
