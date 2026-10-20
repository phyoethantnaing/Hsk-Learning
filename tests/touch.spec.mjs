import { test, expect } from "@playwright/test";
test.use({ hasTouch: true });
// A coordinate tap is sent exactly once: no locator.tap actionability retries.
async function tap(page, selector) {
  const el = page.locator(selector).first();
  await el.scrollIntoViewIfNeeded();
  const box = await el.boundingBox();
  const point = { x: box.x + box.width / 2, y: box.y + box.height / 2 };
  expect(
    await el.evaluate(
      (el, p) => el.contains(document.elementFromPoint(p.x, p.y)),
      point,
    ),
    `hit target ${selector}`,
  ).toBe(true);
  await page.touchscreen.tap(point.x, point.y);
}
test("native level, lesson, word, pager and tab links activate with one coordinate tap", async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.goto("./");
  await tap(page, ".levels a");
  await expect(page).toHaveURL(/\/hsk1\/?$/);
  await tap(page, ".lessons a");
  await expect(page).toHaveURL(/\/lesson\/1\/?$/);
  await tap(page, ".word-card");
  await expect(page).toHaveURL(/hsk1-0001\/?$/);
  await tap(page, "[rel=next]");
  await expect(page).toHaveURL(/hsk1-0002\/?$/);
  await tap(page, "[rel=prev]");
  await expect(page).toHaveURL(/hsk1-0001\/?$/);
  for (const [section, end] of [
    ["search", "search"],
    ["cards", "flashcards"],
    ["learn", "hsk1"],
    ["home", ""],
  ]) {
    await tap(page, `#site-nav [data-section=${section}]`);
    await expect(page).toHaveURL(new RegExp(`/Hsk-Learning/${end}/?$`));
  }
});
test("learned control exposes loading until ready, then the first valid tap updates once", async ({
  page,
}) => {
  let release;
  const gate = new Promise((r) => (release = r));
  await page.route("**/_astro/LearnedButton*.js", async (route) => {
    await gate;
    await route.continue();
  });
  try {
    await page.goto("hsk1/hsk1-0001/", { waitUntil: "commit" });
    const button = page.locator("[data-learned-id]");
    await expect(button).toBeDisabled();
    await expect(button).toHaveAttribute("aria-busy", "true");
    release();
    await expect(button).toBeEnabled();
    await tap(page, "[data-learned-id]");
    await expect(button).toHaveAttribute("aria-pressed", "true");
    expect(
      await page.evaluate(() =>
        Object.keys(
          JSON.parse(localStorage.getItem("hsk-mm-progress-v1")).learned,
        ),
      ),
    ).toEqual(["hsk1-0001"]);
  } finally {
    release();
  }
});
test("typing before the search module loads is retained and searched", async ({
  page,
}) => {
  let release;
  const gate = new Promise((r) => (release = r));
  await page.route("**/_astro/search*.js", async (route) => {
    await gate;
    await route.continue();
  });
  try {
    await page.goto("search/", { waitUntil: "commit" });
    await page.locator("#q").fill("love");
    await expect(page.locator("[data-query]").first()).toBeDisabled();
    release();
    await expect(page.locator("#q")).toHaveValue("love");
    await expect(page.locator("[data-results] a").first()).toHaveAttribute(
      "href",
      /hsk1-0001\/?$/,
    );
    await expect(page).toHaveURL(/q=love/);
    await tap(page, "[data-search-clear]");
    await expect(page.locator("#q")).toHaveValue("");
    await tap(page, "[data-query=ai4]");
    // 爱 ranks first; longer words such as 爱好 (HSK 2) follow it.
    await expect(page.locator("[data-results] a").first()).toHaveAttribute(
      "href",
      /hsk1-0001\/?$/,
    );
    await tap(page, "[data-results] a >> nth=0");
    await expect(page).toHaveURL(/hsk1-0001\/?$/);
  } finally {
    release();
  }
});
test("fast flashcard taps reveal and answer each card once without moving targets", async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.goto("hsk1/lesson/1/flashcards/");
  for (let n = 0; n < 6; n++) {
    const front = page.locator("[data-card]:not([hidden]) [data-flip]");
    await expect(front).toBeVisible();
    const before = await front.boundingBox();
    await tap(page, "[data-card]:not([hidden]) [data-flip]");
    await expect(page.locator("[data-answer]")).toBeVisible();
    await tap(page, "[data-known=true]");
    await expect(page.locator("[data-pos]")).toHaveText(
      String(n + 2).replace(/\d/g, (d) => "၀၁၂၃၄၅၆၇၈၉"[+d]),
    );
    expect(
      (
        await page
          .locator("[data-card]:not([hidden]) [data-flip]")
          .boundingBox()
      ).width,
    ).toBeCloseTo(before.width, 0);
  }
  expect(
    await page.evaluate(() =>
      Object.values(
        JSON.parse(localStorage.getItem("hsk-mm-progress-v1")).cards,
      ).reduce((sum, x) => sum + x.known, 0),
    ),
  ).toBe(6);
});
test("appearance, script toggle and audio respond to one touch without double activation", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.speeches = 0;
    Object.defineProperty(window, "speechSynthesis", {
      value: {
        getVoices: () => [],
        cancel() {},
        speak() {
          window.speeches++;
        },
      },
    });
  });
  await page.goto("hsk1/hsk1-0001/");
  await tap(page, ".script-toggle");
  await expect(page.locator(".script-toggle")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await tap(page, "[data-speak]");
  await expect(page.locator("[data-speak]").first()).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await tap(page, "[data-speak]");
  await expect(page.locator("[data-speak]").first()).toHaveAttribute(
    "aria-pressed",
    "false",
  );
  expect(await page.evaluate(() => window.speeches)).toBe(1);
  await page.evaluate(() => scrollTo(0, 0));
  await tap(page, "[data-appearance-open]");
  await expect(page.locator("dialog")).toBeVisible();
  await tap(page, "label:has([data-theme-choice][value=dark])");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await tap(page, "[data-appearance-close]");
  await expect(page.locator("dialog")).toBeHidden();
});
test("progress reads one storage snapshot per document rather than one per indicator", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.progressReads = 0;
    const original = Storage.prototype.getItem;
    Storage.prototype.getItem = function (key) {
      if (key === "hsk-mm-progress-v1") window.progressReads++;
      return original.call(this, key);
    };
  });
  await page.goto("hsk1/");
  expect(await page.evaluate(() => window.progressReads)).toBe(1);
  const other = await page.context().newPage();
  await other.goto("hsk1/hsk1-0001/");
  await other.locator("[data-learned-id]").click();
  await expect(page.locator(".progress .count").first()).toHaveText("1");
  expect(await page.evaluate(() => window.progressReads)).toBe(2);
  await other.evaluate(() => localStorage.removeItem("hsk-mm-progress-v1"));
  await expect(page.locator(".progress .count").first()).toHaveText("0");
  expect(await page.evaluate(() => window.progressReads)).toBe(3);
  await other.close();
});
