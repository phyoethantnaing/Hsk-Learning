// Reproducible exhaustive geometry/runtime/icon audit. Run after npm run build
// and npm run preview. No educational content or persistent user data is changed.
import { chromium } from "@playwright/test";
import { readdir, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { navigationSection } from "../src/lib/navigation.mjs";
const base =
  process.env.AUDIT_BASE_URL || "http://localhost:4321/Hsk-Learning/";
const output = process.env.AUDIT_OUTPUT || "artifacts/audit";
await mkdir(output, { recursive: true });
async function htmlFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((entry) =>
        entry.isDirectory()
          ? htmlFiles(join(dir, entry.name))
          : entry.name.endsWith(".html")
            ? [join(dir, entry.name)]
            : [],
      ),
    )
  ).flat();
}
const routes = (await htmlFiles("dist")).map((path) =>
  path
    .replace(/^dist\//, "")
    .replace(/(?:^|\/)index\.html$/, (match) =>
      match.startsWith("/") ? "/" : "",
    ),
);
const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH || undefined,
});
const findings = [],
  inventory = new Map();
async function inspect(page, route, label, width) {
  const errors = [];
  const error = (e) => errors.push(e.message);
  page.on("pageerror", error);
  const response = await page.goto(new URL(route, base).href);
  await page.evaluate(() => document.fonts.ready);
  const metrics = await page.evaluate(
    (known) => {
      // Identical vector paths need only one geometry measurement. Repeated
      // getBBox calls otherwise force thousands of layouts in the QA harness.
      const verified = new Map(
        known.map((icon) => [icon.name + icon.path, icon]),
      );
      const icons = [...document.querySelectorAll("svg[data-icon]")].map(
        (svg) => {
          const path = svg.querySelector("path").getAttribute("d");
          const key = svg.dataset.icon + path;
          if (verified.has(key)) return verified.get(key);
          const clone = svg.cloneNode(true);
          clone.style.cssText =
            "position:fixed;left:0;top:0;display:block;visibility:hidden;pointer-events:none";
          document.body.append(clone);
          const box = clone.querySelector("path").getBBox();
          clone.remove();
          const icon = {
            name: svg.dataset.icon,
            path,
            bounds: [box.x, box.y, box.width, box.height],
            clipped:
              (box.width > 0 || box.height > 0) &&
              (box.x < 0.5 ||
                box.y < 0.5 ||
                box.x + box.width > 23.5 ||
                box.y + box.height > 23.5),
          };
          verified.set(key, icon);
          return icon;
        },
      );
      const nav = document.querySelector("#site-nav");
      const rect = nav.getBoundingClientRect();
      return {
        overflow: document.documentElement.scrollWidth > innerWidth,
        h1: document.querySelectorAll("main h1").length,
        active: nav.querySelector("[aria-current]")?.dataset.section || null,
        navVisible: rect.width > 0 && rect.height > 0,
        smallTargets: [
          ...nav.querySelectorAll("a"),
          ...document.querySelectorAll("button:not([hidden])"),
        ]
          .filter((el) => el.getClientRects().length)
          .filter((el) => {
            const r = el.getBoundingClientRect();
            return r.width < 43.5 || r.height < 43.5;
          })
          .map((el) => el.outerHTML.slice(0, 160)),
        icons,
      };
    },
    [...inventory.values()],
  );
  page.off("pageerror", error);
  for (const icon of metrics.icons) inventory.set(icon.name, icon);
  const expected = navigationSection("/" + route);
  const issues = [];
  if (response.status() >= 400) issues.push("HTTP " + response.status());
  if (metrics.overflow) issues.push("horizontal overflow");
  if (metrics.h1 !== 1) issues.push("heading count");
  if (metrics.active !== expected) issues.push("active section");
  if (!metrics.navVisible) issues.push("hidden navigation");
  if (metrics.smallTargets.length) issues.push("small controls");
  issues.push(...errors);
  const clipped = metrics.icons.filter((icon) => icon.clipped);
  if (clipped.length)
    issues.push("clipped icons: " + clipped.map((x) => x.name).join(","));
  if (issues.length)
    findings.push({
      route,
      label,
      width,
      issues,
      smallTargets: metrics.smallTargets,
    });
}
const modes = [
  { width: 390, height: 844, theme: "light" },
  { width: 390, height: 844, theme: "dark" },
  { width: 1440, height: 900, theme: "light" },
  { width: 1440, height: 900, theme: "dark" },
];
await Promise.all(
  modes.map(async (mode) => {
    const context = await browser.newContext({
      viewport: mode,
      colorScheme: mode.theme,
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    for (const route of routes)
      await inspect(page, route, mode.theme, mode.width);
    console.log(
      `Audited ${routes.length} routes at ${mode.width}/${mode.theme}`,
    );
    await context.close();
  }),
);
const representative = [
  "",
  "start/",
  "hsk1/",
  "hsk1/lesson/1/",
  "hsk1/hsk1-0001/",
  "hsk1/hsk1-0300/",
  "search/?q=love",
  "flashcards/",
  "hsk1/lesson/1/flashcards/",
  "about/",
  "404.html",
];
const viewports = [
  [320, 568],
  [375, 667],
  [390, 844],
  [393, 852],
  [402, 874],
  [430, 932],
  [768, 1024],
  [1024, 1366],
  [1440, 900],
  [568, 320],
  [844, 390],
];
await Promise.all(
  ["light", "dark"].map(async (theme) => {
    const context = await browser.newContext({
      colorScheme: theme,
      reducedMotion: "reduce",
    });
    const page = await context.newPage();
    for (const [width, height] of viewports) {
      await page.setViewportSize({ width, height });
      for (const route of representative)
        await inspect(page, route, theme, width);
    }
    await context.close();
  }),
);
await browser.close();
const report = {
  routes: routes.length,
  auditedRoutes: routes,
  routeChecks: routes.length * 4,
  matrixChecks: viewports.length * representative.length * 2,
  viewports,
  icons: [...inventory.values()],
  findings,
};
await writeFile(
  join(output, "exhaustive-ui.json"),
  JSON.stringify(report, null, 2),
);
console.log(
  JSON.stringify({
    ...report,
    auditedRoutes: undefined,
    icons: report.icons.length,
    findings: findings.slice(0, 15),
  }),
);
if (findings.length) process.exitCode = 1;
