import { test, expect } from "@playwright/test";

const progressKey = "hsk-mm-progress-v1";
const routes = [
  "",
  "start/",
  "hsk1/",
  "hsk1/lesson/1/",
  "hsk1/hsk1-0001/",
  "search/",
  "flashcards/",
  "hsk1/lesson/1/flashcards/",
  "about/",
  "404.html",
];

test("every page type loads without script errors or horizontal overflow", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  for (const route of routes) {
    const response = await page.goto(route || "./");
    expect(response.status()).toBeLessThan(400);
    await expect(page.locator("main h1")).toHaveCount(1);
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    await expect(page.locator("footer")).toContainText("CC BY-SA 4.0");
  }
  expect(errors).toEqual([]);
});

test("only published levels are linked", async ({ page }) => {
  await page.goto("./");
  await expect(page.locator(".levels a")).toHaveCount(1);
  await expect(page.locator(".levels a")).toHaveAttribute(
    "href",
    /\/Hsk-Learning\/hsk1/,
  );
  await expect(page.locator(".levels .level:not(.ready)")).toHaveCount(6);
});

test("appearance follows the system and manual selection persists", async ({
  page,
}) => {
  await page.goto("./");
  await page.emulateMedia({ colorScheme: "dark" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.selectOption("[data-theme-select]", "light");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await page.selectOption("[data-theme-select]", "system");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});

test("mobile navigation supports keyboard, Escape, and links", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("./");
  const button = page.locator(".menu-toggle");
  await expect(page.locator("#site-nav")).toBeHidden();
  await button.focus();
  await page.keyboard.press("Enter");
  await expect(button).toHaveAttribute("aria-expanded", "true");
  await page.keyboard.press("Escape");
  await expect(button).toBeFocused();
  await expect(page.locator("#site-nav")).toBeHidden();
  await button.click();
  await page.locator('#site-nav a[href$="/search/"]').click();
  await expect(page.locator("#q")).toBeVisible();
});

test("Chinese, Traditional, Pinyin, Myanmar and English searches keep deep links", async ({
  page,
}) => {
  await page.goto("search/?q=ai4");
  for (const query of ["爱", "愛", "ài", "ai4", "ချစ်", "love"]) {
    await page.locator("#q").fill(query);
    await expect(page.locator("[data-results] a").first()).toHaveAttribute(
      "href",
      /\/Hsk-Learning\/hsk1\/hsk1-0001\//,
    );
  }
  await page.locator("#q").fill("zzzzzzzz");
  await expect(page.locator("[data-status]")).toContainText("မတွေ့ပါဘူး");
  await page.locator("#q").fill("");
  await expect(page.locator("[data-search-empty]")).toBeVisible();
});

test("search reports a network error and retries safely", async ({ page }) => {
  await page.route("**/search-index.json", (route) =>
    route.fulfill({ status: 503, body: "unavailable" }),
  );
  await page.goto("search/");
  await page.locator("#q").fill("love");
  await expect(page.locator("[data-status]")).toContainText("အင်တာနက်");
  await expect(page.locator("[data-results]")).toHaveAttribute(
    "aria-busy",
    "false",
  );
  await page.unroute("**/search-index.json");
  await page.locator("#q").fill("爱");
  await expect(page.locator("[data-results] a")).toHaveCount(1);
});

test("existing saved progress survives themes, navigation, and flashcard answers", async ({
  page,
}) => {
  await page.goto("./");
  await page.evaluate(
    (key) =>
      localStorage.setItem(
        key,
        JSON.stringify({
          learned: { "hsk1-0002": 123 },
          cards: { "hsk1-0002": { known: 2, unknown: 1, last: 123 } },
        }),
      ),
    progressKey,
  );
  await page.goto("hsk1/hsk1-0001/");
  await page.locator("[data-learned-id]").click();
  await page.selectOption("[data-theme-select]", "dark");
  await page.reload();
  await expect(page.locator("[data-learned-id]")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await page.goto("hsk1/lesson/1/");
  await expect(page.locator("[role=progressbar]")).toHaveAttribute(
    "aria-valuenow",
    "2",
  );
  await page.goto("hsk1/lesson/1/flashcards/");
  const front = page.locator("[data-card]:visible .front");
  await front.focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("[data-card]:visible .back")).toBeFocused();
  await page.locator("[data-known=true]").click();
  const saved = await page.evaluate(
    (key) => JSON.parse(localStorage.getItem(key)),
    progressKey,
  );
  expect(saved.learned["hsk1-0002"]).toBe(123);
  expect(saved.cards["hsk1-0002"]).toEqual({ known: 2, unknown: 1, last: 123 });
  expect(saved.cards["hsk1-0001"].known).toBe(1);
  await expect(page.locator("[data-deck-progress]")).toHaveAttribute(
    "aria-valuenow",
    "1",
  );
});

test("flashcard completion, retry, and restart work", async ({ page }) => {
  test.setTimeout(90000);
  await page.goto("hsk1/lesson/1/flashcards/");
  for (let i = 0; i < 20; i++) {
    await page.locator("[data-card]:visible [data-flip]").click();
    await page.locator(`[data-known=${i === 0 ? "false" : "true"}]`).click();
  }
  await expect(page.locator("[data-done]")).toBeVisible();
  await expect(page.locator("[data-done]")).toBeFocused();
  await expect(page.locator("[data-known-count]")).toHaveText("၁၉");
  await page.locator("[data-retry]").click();
  await expect(page.locator("[data-total]")).toHaveText("၁");
  await page.locator("[data-card]:visible [data-flip]").click();
  await page.locator("[data-known=true]").click();
  await expect(page.locator("[data-retry]")).toBeHidden();
  await page.locator("[data-restart]").click();
  await expect(page.locator("[data-total]")).toHaveText("၂၀");
});

test("audio fallback and Traditional toggle stay functional", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "speechSynthesis", {
      value: {
        getVoices: () => [],
        addEventListener() {},
        cancel() {},
        speak(utterance) {
          window.__spoken = { text: utterance.text, lang: utterance.lang };
          utterance.onend?.();
        },
      },
    });
  });
  await page.goto("hsk1/hsk1-0001/");
  await page.locator("[data-speak]").first().click();
  expect(await page.evaluate(() => window.__spoken)).toEqual({
    text: "爱",
    lang: "zh-CN",
  });
  await page.locator(".script-toggle").click();
  await expect(page.locator(".trad")).toBeVisible();
  await expect(page.locator(".simp")).toBeHidden();
});

test("narrow, landscape, tablet, and large text layouts do not overflow", async ({
  page,
}) => {
  test.setTimeout(90000);
  for (const width of [320, 360, 768, 844, 1024, 1920]) {
    await page.setViewportSize({ width, height: width === 844 ? 390 : 900 });
    for (const route of [
      "./",
      "start/",
      "hsk1/lesson/1/",
      "hsk1/hsk1-0001/",
      "hsk1/lesson/1/flashcards/",
    ]) {
      await page.goto(route);
      expect(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        `${route} at ${width}`,
      ).toBe(true);
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("hsk1/hsk1-0001/");
  await page.addStyleTag({ content: "html { font-size: 200%; }" });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("hsk1/lesson/1/flashcards/");
  expect(
    await page
      .locator(".front")
      .first()
      .evaluate((el) => getComputedStyle(el).animationName),
  ).toBe("none");
});

test("blocked storage leaves learning and appearance controls usable", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.getItem = () => {
      throw new DOMException("Blocked", "SecurityError");
    };
    Storage.prototype.setItem = () => {
      throw new DOMException("Blocked", "SecurityError");
    };
  });
  await page.goto("hsk1/hsk1-0001/");
  await page.selectOption("[data-theme-select]", "dark");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.locator("[data-learned-id]").click();
  await expect(page.locator("[data-learned-id]")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

test("readable pages and navigation remain available without JavaScript", async ({
  browser,
}) => {
  const context = await browser.newContext({
    javaScriptEnabled: false,
    viewport: { width: 390, height: 844 },
    colorScheme: "dark",
  });
  const page = await context.newPage();
  const base =
    process.env.PLAYWRIGHT_BASE_URL || "http://localhost:4321/Hsk-Learning/";
  await page.goto(base);
  await expect(page.locator("#site-nav")).toBeVisible();
  await page.locator('#site-nav a[href$="/start/"]').click();
  await expect(page.locator("main h1")).toBeVisible();
  await page.goto(base + "hsk1/lesson/1/");
  await expect(page.locator(".word-card")).toHaveCount(20);
  await context.close();
});

test("local Myanmar and Chinese fonts load without third-party requests", async ({
  page,
}) => {
  const fontFailures = [];
  page.on("requestfailed", (request) => fontFailures.push(request.url()));
  await page.goto("hsk1/hsk1-0001/");
  const families = await page.evaluate(async () => {
    await Promise.all([
      document.fonts.load('400 16px "HSK Myanmar"', "မြန်မာ"),
      document.fonts.load('700 16px "HSK Myanmar"', "မြန်မာ"),
      document.fonts.load('400 16px "HSK CJK SC"', "爱"),
      document.fonts.load('400 16px "HSK CJK TC"', "愛"),
    ]);
    return [...document.fonts]
      .filter((font) => font.status === "loaded")
      .map((font) => font.family);
  });
  expect(families).toEqual(
    expect.arrayContaining(["HSK Myanmar", "HSK CJK SC", "HSK CJK TC"]),
  );
  expect(fontFailures).toEqual([]);
  expect(
    await page.evaluate(() =>
      performance
        .getEntriesByType("resource")
        .every((resource) => new URL(resource.name).origin === location.origin),
    ),
  ).toBe(true);
});
