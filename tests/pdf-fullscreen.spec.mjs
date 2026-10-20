import { test, expect } from "@playwright/test";
const book = "a[href$='/reader/vocabulary-hsk-1/']";
const host = "[data-reader-host]";
async function ready(page) {
  await expect(page.locator("[data-pdf-status]")).toContainText(
    "Text selection available",
    { timeout: 60000 },
  );
  await expect(page.locator("[data-pdf-scroll]")).toHaveAttribute(
    "aria-busy",
    "false",
  );
}
test("fullscreen opens before PDF response; close restores scroll, focus and browser history", async ({
  page,
}) => {
  let release;
  const gate = new Promise((r) => (release = r));
  await page.route("**/pdfs/*.pdf", async (route) => {
    await gate;
    await route.abort().catch(() => {});
  });
  await page.goto("library/");
  await page.locator(book).scrollIntoViewIfNeeded();
  const previousY = await page.evaluate(() => scrollY);
  await page.locator(book).click();
  await expect(page.locator(host)).toHaveJSProperty("open", true);
  await expect(page.locator("[data-pdf-close]")).toBeVisible();
  await expect(page.locator("[data-pdf-paper]")).toBeHidden();
  expect(
    await page.locator("[data-pdf-reader]").evaluate((el) => {
      const r = el.getBoundingClientRect();
      return r.top === 0 && Math.abs(r.height - innerHeight) < 2;
    }),
  ).toBe(true);
  await page.locator("[data-pdf-close]").click();
  await expect(page).toHaveURL(/library\/?$/);
  await expect(page.locator(host)).toHaveJSProperty("open", false);
  expect(await page.evaluate(() => scrollY)).toBeCloseTo(previousY, 0);
  await expect(page.locator(book)).toBeFocused();
  release();
  await page.unroute("**/pdfs/*.pdf");
  await page.goForward();
  await expect(page.locator(host)).toHaveJSProperty("open", true);
  await ready(page);
  await page.goBack();
  await expect(page.locator(host)).toHaveJSProperty("open", false);
});
test("same book reuses worker and PDF, rapid close/reopen and switching stay correct", async ({
  page,
}) => {
  let pdfRequests = 0,
    workers = 0;
  page.on("request", (r) => {
    if (r.url().endsWith("vocabulary-hsk-1.pdf")) pdfRequests++;
    if (r.url().includes("pdf.worker")) workers++;
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("library/");
  await page.locator(book).click();
  await ready(page);
  const firstRequests = pdfRequests;
  await page.locator("[data-pdf-close]").click();
  await expect(page.locator(host)).toHaveJSProperty("open", false);
  await page.locator(book).click();
  await ready(page);
  expect(pdfRequests).toBe(firstRequests);
  await page.evaluate(() => {
    dispatchEvent(new PageTransitionEvent("pagehide", { persisted: true }));
    dispatchEvent(new PageTransitionEvent("pageshow", { persisted: true }));
  });
  await page.locator("[data-pdf-next]").click();
  await expect(page.locator("[data-pdf-status]")).toContainText("Page 2 of");
  expect(workers).toBe(1);
  await page.locator("[data-pdf-close]").click();
  await expect(page.locator(host)).toHaveJSProperty("open", false);
  await page.locator("a[href$='/reader/vocabulary-hsk-2/']").click();
  await ready(page);
  await expect(page.locator("[data-pdf-title]")).toContainText("HSK 2");
  for (let i = 0; i < 3; i++) {
    await page.locator("[data-pdf-close]").click();
    await expect(page.locator(host)).toHaveJSProperty("open", false);
    await page.locator(book).click();
  }
  await ready(page);
  await expect(page.locator("[data-pdf-title]")).toContainText("HSK 1");
  expect(workers).toBe(1);
  expect(errors).toEqual([]);
});
test("stalled network gets bounded recovery and close stays available", async ({
  page,
}) => {
  await page.clock.install();
  let release;
  const gate = new Promise((r) => (release = r));
  let requested = false;
  await page.route("**/pdfs/*.pdf", async (route) => {
    requested = true;
    await gate;
    await route.abort().catch(() => {});
  });
  await page.goto("library/");
  await page.locator(book).click();
  await expect.poll(() => requested).toBe(true);
  await page.clock.fastForward(47000);
  await expect(page.locator("[data-pdf-error]")).toBeVisible();
  await expect(page.locator("[data-pdf-error-message]")).toContainText(
    "45 seconds",
  );
  release();
  await page.unroute("**/pdfs/*.pdf");
  await page.locator("[data-pdf-retry]").click();
  await ready(page);
  await page.locator("[data-pdf-close]").click();
  await expect(page).toHaveURL(/library\/?$/);
});
test("invalid PDFs explain the failure and immersive direct routes have no website chrome", async ({
  page,
}) => {
  await page.route("**/pdfs/*.pdf", (r) =>
    r.fulfill({
      status: 200,
      contentType: "application/pdf",
      body: "not a PDF",
    }),
  );
  await page.goto("reader/vocabulary-hsk-1/");
  await expect(
    page.locator(".site-header,.site-footer,.app-navigation"),
  ).toHaveCount(0);
  await expect(page.locator("[data-pdf-error-message]")).toContainText(
    "not a supported PDF",
    { timeout: 60000 },
  );
  await page.locator("[data-pdf-close]").click();
  await expect(page).toHaveURL(/library\/?$/);
});
test("yellow and legacy gold highlights survive fullscreen close and reopening", async ({
  page,
}) => {
  await page.goto("library/");
  await page.locator(book).click();
  await ready(page);
  await page.locator("[data-pdf-text]").evaluate((el) => {
    const text = [...el.querySelectorAll("span")].find((s) =>
      s.textContent.includes("HSK 1 Vocabulary"),
    );
    const range = document.createRange();
    range.selectNodeContents(text);
    const s = getSelection();
    s.removeAllRanges();
    s.addRange(range);
    document.dispatchEvent(new Event("selectionchange"));
  });
  await page.locator("[data-pdf-color]").selectOption("yellow");
  await page.locator("[data-pdf-save]").click();
  await expect(page.locator(".reader-mark").first()).toHaveAttribute(
    "data-color",
    "yellow",
  );
  await page.locator("[data-pdf-close]").click();
  await expect(page.locator(host)).toHaveJSProperty("open", false);
  await page.locator(book).click();
  await ready(page);
  await expect(page.locator("[data-pdf-list] li")).toHaveCount(1);
  await expect(page.locator(".reader-mark").first()).toHaveAttribute(
    "data-color",
    "yellow",
  );
});

test("first open commits one canvas and failed reader initialization retries by reloading", async ({
  page,
}) => {
  await page.goto("library/");
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => {
    window.canvasCommits = 0;
    new MutationObserver((records) => {
      for (const record of records)
        for (const node of record.addedNodes)
          if (node.nodeName === "CANVAS") window.canvasCommits++;
    }).observe(document.querySelector("[data-pdf-paper]"), { childList: true });
  });
  await page.locator(book).click();
  await ready(page);
  await page.waitForTimeout(400);
  expect(await page.evaluate(() => window.canvasCommits)).toBe(1);
  await page.route("**/_astro/pdf.*.js", (r) => r.abort());
  await page.goto("reader/vocabulary-hsk-1/");
  await expect(page.locator("[data-pdf-error-message]")).toContainText(
    "could not initialize",
    { timeout: 60000 },
  );
  await page.unroute("**/_astro/pdf.*.js");
  await page.locator("[data-pdf-retry]").click();
  await ready(page);
});

test("immersive reader follows system appearance and preserves manual preferences", async ({
  page,
}) => {
  await page.goto("reader/vocabulary-hsk-1/");
  await ready(page);
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.evaluate(() => {
    localStorage.setItem("hsk-mm-theme-v1", "dark");
    dispatchEvent(
      new StorageEvent("storage", { key: "hsk-mm-theme-v1", newValue: "dark" }),
    );
  });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.reload();
  await ready(page);
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
});
