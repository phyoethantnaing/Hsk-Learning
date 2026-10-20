// Local/production visual, rendering and responsive QA for the complete catalog.
import { chromium } from "@playwright/test";
import { mkdir, writeFile, readFile } from "node:fs/promises";
import { READABLE_PDFS } from "../src/lib/pdf-library.mjs";
const base =
  process.env.PDF_QA_BASE_URL || "http://localhost:4321/Hsk-Learning/";
const output = process.env.PDF_QA_OUTPUT || "artifacts/pdf-reader";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
});
const failures = [],
  samples = [],
  errors = [],
  axe = [];
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  hasTouch: true,
  isMobile: true,
});
const page = await context.newPage();
page.on("pageerror", (e) => errors.push(e.message));
page.on("console", (m) => {
  if (m.type() === "error") errors.push(m.text());
});
page.on("response", (r) => {
  if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`);
});
async function ready(number) {
  await page.waitForFunction(
    (n) =>
      document.querySelector("[data-pdf-scroll]")?.getAttribute("aria-busy") ===
        "false" &&
      document
        .querySelector("[data-pdf-status]")
        ?.textContent.startsWith(`Page ${n} of`),
    number,
    { timeout: 90000 },
  );
  if (await page.locator("[data-pdf-error]").isVisible())
    throw new Error("Reader error");
}
// Check first, middle and last pages of every hosted original, including image scans.
if (!process.env.PDF_QA_SKIP_CATALOG)
  for (const doc of READABLE_PDFS) {
    try {
      const opening = performance.now();
      await page.goto(new URL(`reader/${doc.id}/#page=1`, base).href);
      await ready(1);
      const openMs = performance.now() - opening;
      for (const number of [
        ...new Set([1, Math.ceil(doc.pages / 2), doc.pages]),
      ]) {
        const start = performance.now();
        if (number !== 1) {
          await page.locator("#pdf-page").fill(String(number));
          await page.locator(".reader-go").click();
          await ready(number);
        }
        const data = await page.locator("[data-pdf-canvas]").evaluate((c) => ({
          width: c.width,
          height: c.height,
          pixels: c.width * c.height,
        }));
        samples.push({
          id: doc.id,
          page: number,
          renderMs: Math.round(
            number === 1 ? openMs : performance.now() - start,
          ),
          ...data,
        });
        if (data.pixels > 6050000)
          failures.push({
            id: doc.id,
            page: number,
            type: "canvas-budget",
            ...data,
          });
      }
      console.log(`Rendered ${doc.id}: first, middle, last`);
    } catch (e) {
      failures.push({ id: doc.id, error: e.message });
    }
  }
for (const theme of ["light", "dark"]) {
  await page.emulateMedia({ colorScheme: theme, reducedMotion: "reduce" });
  await page.evaluate((t) => localStorage.setItem("hsk-mm-theme-v1", t), theme);
  for (const [width, height] of [
    [320, 568],
    [375, 667],
    [390, 844],
    [393, 852],
    [402, 874],
    [430, 932],
    [768, 1024],
    [1024, 1366],
    [1440, 900],
    [844, 390],
  ]) {
    await page.setViewportSize({ width, height });
    for (const route of ["library/", "reader/vocabulary-hsk-1/#page=1"]) {
      await page.goto(new URL(route, base).href);
      if (route.startsWith("reader")) await ready(1);
      await page.evaluate(() => document.fonts.ready);
      const data = await page.evaluate(() => ({
        overflow: document.documentElement.scrollWidth > innerWidth,
        small: [
          ...document.querySelectorAll("main button,main input,main select"),
        ]
          .filter(
            (e) =>
              e.getBoundingClientRect().width > 0 &&
              (e.getBoundingClientRect().width < 43.5 ||
                e.getBoundingClientRect().height < 43.5),
          )
          .map((e) => e.outerHTML.slice(0, 150)),
      }));
      if (data.overflow || data.small.length)
        failures.push({ route, width, height, theme, ...data });
      if ([390, 1440].includes(width)) {
        await page.evaluate(() => scrollTo(0, 0));
        const name = `${route.startsWith("reader") ? "reader" : "library"}-${width}-${theme}`;
        await page.screenshot({
          path: `${output}/${name}.png`,
          fullPage: true,
        });
        if (process.env.PDF_QA_AXE_PATH) {
          await page.addScriptTag({
            content: await readFile(process.env.PDF_QA_AXE_PATH, "utf8"),
          });
          const result = await page.evaluate(() =>
            axe.run(document.querySelector("main"), {
              runOnly: {
                type: "tag",
                values: ["wcag2a", "wcag2aa", "wcag21aa", "wcag22aa"],
              },
            }),
          );
          axe.push({
            name,
            violations: result.violations.map((v) => ({
              id: v.id,
              impact: v.impact,
              nodes: v.nodes.map((n) => ({
                target: n.target,
                summary: n.failureSummary,
              })),
            })),
          });
        }
      }
    }
  }
}
await writeFile(
  `${output}/qa.json`,
  JSON.stringify(
    { base, samples, failures, errors: [...new Set(errors)], axe },
    null,
    2,
  ),
);
console.log(
  JSON.stringify({
    pages: samples.length,
    responsiveCases: 40,
    failures: failures.length,
    errors: [...new Set(errors)],
    axeViolations: axe.reduce((s, x) => s + x.violations.length, 0),
  }),
);
await browser.close();
if (failures.length || errors.length || axe.some((x) => x.violations.length))
  process.exitCode = 1;
