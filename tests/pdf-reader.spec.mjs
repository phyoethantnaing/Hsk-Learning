import { test, expect } from "@playwright/test";
import { READABLE_PDFS, PDF_DOCUMENTS } from "../src/lib/pdf-library.mjs";
const reader = "reader/vocabulary-hsk-1/";
async function ready(page, number = 1) {
  await expect(page.locator("[data-pdf-scroll]")).toHaveAttribute(
    "aria-busy",
    "false",
    { timeout: 60000 },
  );
  await expect(page.locator("[data-pdf-status]")).toContainText(
    `Page ${number} of`,
  );
  await expect(page.locator("[data-pdf-error]")).toBeHidden();
}
async function selectText(page) {
  await page.locator("[data-pdf-text]").evaluate((layer) => {
    const node = [...layer.querySelectorAll("span")].find((el) =>
      el.textContent.includes("HSK 1 Vocabulary"),
    );
    const selection = window.getSelection(),
      range = document.createRange();
    range.selectNodeContents(node);
    selection.removeAllRanges();
    selection.addRange(range);
    document.dispatchEvent(new Event("selectionchange"));
  });
  await expect(page.locator("[data-pdf-save]")).toBeEnabled();
}
async function oneTap(page, selector) {
  const el = page.locator(selector);
  await el.scrollIntoViewIfNeeded();
  const box = await el.boundingBox();
  const point = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  expect(
    await el.evaluate(
      (el, p) => el.contains(document.elementFromPoint(p.x, p.y)),
      point,
    ),
  ).toBe(true);
  await page.touchscreen.tap(point.x, point.y);
}
test.use({ hasTouch: true });
test("library lists 18 Drive files and seven existing resources with honest hosting states", async ({
  page,
}) => {
  await page.goto("library/");
  await expect(page.locator(".pdf-book")).toHaveCount(PDF_DOCUMENTS.length);
  await expect(page.locator(".pdf-unavailable")).toHaveCount(2);
  await expect(page.locator(".pdf-grid a[href*='/reader/']")).toHaveCount(
    READABLE_PDFS.length,
  );
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.locator(".pdf-grid a[href*='/reader/vocabulary-hsk-1/']").click();
  await ready(page);
  await page.goBack();
  await expect(page).toHaveURL(/library\/?$/);
});
test("PDF page, zoom and fit controls respond once and deep page links survive refresh", async ({
  page,
}) => {
  await page.goto(reader);
  await ready(page);
  await oneTap(page, "[data-pdf-next]");
  await ready(page, 2);
  await oneTap(page, "[data-pdf-prev]");
  await ready(page, 1);
  await expect(page.locator("[data-pdf-prev]")).toBeDisabled();
  const width = await page
    .locator("[data-pdf-paper]")
    .evaluate((el) => el.clientWidth);
  await oneTap(page, "[data-pdf-zoom-in]");
  await ready(page);
  expect(
    await page.locator("[data-pdf-paper]").evaluate((el) => el.clientWidth),
  ).toBeGreaterThan(width);
  await expect(page.locator("[data-pdf-zoom]")).toHaveText("125%");
  await oneTap(page, "[data-pdf-fit]");
  await ready(page);
  await expect(page.locator("[data-pdf-zoom]")).toHaveText("100%");
  await page.locator("#pdf-page").fill("7");
  await page.locator(".reader-go").click();
  await ready(page, 7);
  await expect(page.locator("[data-pdf-next]")).toBeDisabled();
  await page.reload();
  await ready(page, 7);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});
test("colored highlights retain normalized geometry, survive reload and preserve learner data", async ({
  page,
}) => {
  const progress = JSON.stringify({
    learned: { "hsk1-0001": true },
    cards: {},
  });
  await page.addInitScript((value) => {
    if (!localStorage.getItem("hsk-mm-progress-v1"))
      localStorage.setItem("hsk-mm-progress-v1", value);
  }, progress);
  await page.goto(reader);
  await ready(page);
  await selectText(page);
  await page.locator("[data-pdf-color]").selectOption("red");
  await oneTap(page, "[data-pdf-save]");
  await expect(page.locator("[data-pdf-list] li")).toHaveCount(1);
  await expect(page.locator(".reader-mark").first()).toHaveAttribute(
    "data-color",
    "red",
  );
  const original = await page
    .locator(".reader-mark")
    .first()
    .getAttribute("style");
  await oneTap(page, "[data-pdf-zoom-in]");
  await ready(page);
  await expect(page.locator(".reader-mark").first()).toHaveAttribute(
    "style",
    original,
  );
  await page.reload();
  await ready(page);
  await expect(page.locator("[data-pdf-list] li")).toHaveCount(1);
  await expect(page.locator("[data-pdf-list] q")).toHaveText(
    "HSK 1 Vocabulary",
  );
  expect(
    await page.evaluate(() => localStorage.getItem("hsk-mm-progress-v1")),
  ).toBe(progress);
  await page.locator("[aria-label^='Delete highlight']").click();
  await expect(page.locator("[data-pdf-list] li")).toHaveCount(0);
  await page.reload();
  await ready(page);
  await expect(page.locator(".reader-mark")).toHaveCount(0);
});
test("failed PDF requests show a retry state and recover without clearing storage", async ({
  page,
}) => {
  await page.route("**/pdfs/vocabulary-hsk-1.pdf", (route) => route.abort());
  await page.goto(reader);
  await expect(page.locator("[data-pdf-error]")).toBeVisible({
    timeout: 20000,
  });
  await expect(page.locator("[data-pdf-next]")).toBeDisabled();
  await page.unroute("**/pdfs/vocabulary-hsk-1.pdf");
  await page.locator("[data-pdf-retry]").click();
  await ready(page);
});
test("blocked storage allows reading and explicitly reports unsaved highlights", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("Full", "QuotaExceededError");
    };
  });
  await page.goto(reader);
  await ready(page);
  await selectText(page);
  await page.locator("[data-pdf-save]").click();
  await expect(page.locator("[data-pdf-storage]")).toContainText(
    "unavailable or full",
  );
  await expect(page.locator("[data-pdf-list] li")).toHaveCount(1);
  await page.locator("[data-pdf-next]").click();
  await ready(page, 2);
});
test("image-only original pages render with a clear highlighting limitation and no restricted controls", async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.goto("reader/hsk-2-textbook/");
  await ready(page);
  await expect(page.locator("[data-pdf-selection-help]")).toContainText(
    "image scan",
  );
  await expect(page.locator("[data-pdf-save]")).toBeDisabled();
  await expect(
    page.getByRole("button", { name: /download|share|print|export/i }),
  ).toHaveCount(0);
});
test("rapid navigation renders the final requested page without stale commits", async ({
  page,
}) => {
  await page.goto(reader);
  await ready(page);
  await page.locator("[data-pdf-next]").evaluate((el) => {
    el.click();
    el.click();
    el.click();
  });
  await ready(page, 4);
  await expect(page.locator("#pdf-page")).toHaveValue("4");
  await page.locator("[data-pdf-zoom-in]").evaluate((el) => {
    el.click();
    el.click();
  });
  await ready(page, 4);
  await expect(page.locator("[data-pdf-zoom]")).toHaveText("150%");
});

test("highlight changes merge with another tab before a queued storage event", async ({
  page,
  context,
}) => {
  await page.goto(reader);
  await ready(page);
  await selectText(page);
  const other = await context.newPage();
  await other.goto(reader);
  await ready(other);
  await other.locator("[data-pdf-text]").evaluate((layer) => {
    const span = [...layer.querySelectorAll("span")].find((e) =>
      e.textContent.includes("HSK 1 Vocabulary"),
    );
    const r = document.createRange();
    r.selectNodeContents(span);
    const s = getSelection();
    s.removeAllRanges();
    s.addRange(r);
    document.dispatchEvent(new Event("selectionchange"));
  });
  await other.locator("[data-pdf-color]").selectOption("graphite");
  await other.locator("[data-pdf-save]").click();
  await expect(page.locator("[data-pdf-list] li")).toHaveCount(1);
  await page.locator("[data-pdf-color]").selectOption("gold");
  await page.locator("[data-pdf-save]").click();
  await expect(page.locator("[data-pdf-list] li")).toHaveCount(2);
  await expect(other.locator("[data-pdf-list] li")).toHaveCount(2);
  await other.close();
});

test("reader keyboard controls and text zoom remain usable at 320 pixels", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto(reader);
  await ready(page);
  await page.locator("[data-pdf-next]").focus();
  await page.keyboard.press("Enter");
  await ready(page, 2);
  await page.locator("#pdf-page").fill("1");
  await page.locator("#pdf-page").press("Enter");
  await ready(page, 1);
  await page.addStyleTag({ content: "html{font-size:200%}" });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.locator("[data-pdf-zoom-in]").focus();
  await page.keyboard.press("Space");
  await ready(page, 1);
  await expect(page.locator("[data-pdf-zoom]")).toHaveText("125%");
});

test("large text selections are explained instead of silently truncated", async ({
  page,
}) => {
  await page.goto(reader);
  await ready(page);
  await page.locator("[data-pdf-text]").evaluate((layer) => {
    const range = document.createRange();
    range.selectNodeContents(layer);
    const s = getSelection();
    s.removeAllRanges();
    s.addRange(range);
    document.dispatchEvent(new Event("selectionchange"));
  });
  await expect(page.locator("[data-pdf-save]")).toBeDisabled();
  await expect(page.locator("[data-pdf-status]")).toContainText(
    "shorter passage",
  );
  await selectText(page);
  await page.locator("[data-pdf-save]").click();
  await expect(page.locator("[data-pdf-list] q")).toHaveText(
    "HSK 1 Vocabulary",
  );
});

test("page turns return to the top of the page below sticky controls", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto(reader);
  await ready(page);
  const buttonBefore = await page.locator("[data-pdf-next]").boundingBox();
  await page.locator("[data-pdf-next]").click();
  await ready(page, 2);
  const buttonAfter = await page.locator("[data-pdf-next]").boundingBox();
  expect(buttonAfter.y).toBeCloseTo(buttonBefore.y, 0);
  await page.locator("[data-pdf-prev]").click();
  await ready(page, 1);
  await page
    .locator("[data-pdf-paper]")
    .evaluate((el) => el.closest("[data-pdf-body]").scrollTo(0, 650));
  await page.locator("[data-pdf-next]").click();
  await ready(page, 2);
  const geometry = await page.evaluate(() => ({
    top: document.querySelector("[data-pdf-paper]").getBoundingClientRect().top,
    toolbarBottom: document
      .querySelector(".reader-toolbar")
      .getBoundingClientRect().bottom,
  }));
  expect(geometry.top).toBeGreaterThanOrEqual(geometry.toolbarBottom);
  expect(geometry.top).toBeLessThan(300);
});
