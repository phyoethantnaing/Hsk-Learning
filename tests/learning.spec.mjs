import { test, expect } from "@playwright/test";

async function setTheme(page, value) {
  await page.locator("[data-appearance-open]").click();
  await page.locator(`[data-theme-choice][value="${value}"]`).check();
  await page.locator("[data-appearance-close]").click();
}
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
    if (route === "404.html") {
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
        "content",
        "noindex",
      );
      await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);
    }
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
  await setTheme(page, "light");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  await setTheme(page, "system");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.emulateMedia({ colorScheme: "light" });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
});

test("mobile tabs remain visible, route-aware, and keyboard operable", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("./");
  const nav = page.locator("#site-nav");
  await expect(nav).toBeVisible();
  await expect(nav.locator("a")).toHaveCount(4);
  await nav.locator("[data-section=learn]").focus();
  await page.keyboard.press("Enter");
  await expect(nav.locator("[data-section=learn]")).toHaveAttribute(
    "aria-current",
    "page",
  );
  await page.goto("hsk1/lesson/1/");
  await expect(nav.locator("[data-section=learn]")).toHaveAttribute(
    "aria-current",
    "true",
  );
  await page.goto("hsk1/lesson/1/flashcards/");
  await expect(nav.locator("[data-section=cards]")).toHaveAttribute(
    "aria-current",
    "true",
  );
  await nav.locator("[data-section=search]").click();
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
  await setTheme(page, "dark");
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
  await setTheme(page, "dark");
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
  await page.locator('footer a[href$="/start/"]').click();
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

test("appearance sheet traps focus, supports radio keys, Escape and restores focus", async ({
  page,
}) => {
  await page.goto("./");
  const trigger = page.locator("[data-appearance-open]");
  await trigger.click();
  await expect(page.locator("#appearance-dialog")).toBeVisible();
  await expect(page.locator("[value=system]")).toBeFocused();
  await page.keyboard.press("ArrowRight");
  await expect(page.locator("[value=light]")).toBeChecked();
  await page.keyboard.press("Escape");
  await expect(trigger).toBeFocused();
  await expect(page.locator("#appearance-dialog")).toBeHidden();
});

test("search survives refresh, Back and Forward and clear keeps the URL in sync", async ({
  page,
}) => {
  await page.goto("search/");
  await page.locator("#q").fill("love");
  await expect(page).toHaveURL(/q=love/);
  await page.reload();
  await expect(page.locator("[data-results] a")).toHaveCount(1);
  await page.locator("[data-results] a").click();
  await page.goBack();
  await expect(page.locator("#q")).toHaveValue("love");
  await expect(page.locator("[data-results] a")).toHaveCount(1);
  await page.goForward();
  await expect(page.locator("h1")).toContainText("爱");
  await page.goBack();
  await page.locator("[data-search-clear]").click();
  await expect(page).not.toHaveURL(/q=/);
  await expect(page.locator("[data-search-empty]")).toBeVisible();
  await expect(page.locator("#q")).toBeFocused();
});

test("delayed search failure cannot overwrite a cleared query and retry is explicit", async ({
  page,
}) => {
  let release;
  const gate = new Promise((resolve) => {
    release = resolve;
  });
  await page.route("**/search-index.json", async (route) => {
    await gate;
    await route.fulfill({ status: 503, body: "Unavailable" });
  });
  await page.goto("search/");
  await page.locator("#q").fill("love");
  await expect(page.locator("[data-results]")).toHaveAttribute(
    "aria-busy",
    "true",
  );
  await page.locator("[data-search-clear]").click();
  release();
  await expect(page.locator("[data-status]")).toHaveText("");
  await expect(page.locator("[data-search-retry]")).toBeHidden();
  await page.locator("#q").fill("love");
  await expect(page.locator("[data-search-retry]")).toBeVisible();
  await page.unroute("**/search-index.json");
  await page.locator("[data-search-retry]").click();
  await expect(page.locator("[data-results] a")).toHaveCount(1);
});

test("malformed progress containers cannot break learning", async ({
  page,
}) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await page.goto("./");
  await page.evaluate(
    (key) => localStorage.setItem(key, '{"learned":null,"cards":null}'),
    progressKey,
  );
  await page.goto("hsk1/hsk1-0001/");
  await page.locator("[data-learned-id]").click();
  await expect(page.locator("[data-learned-id]")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  expect(errors).toEqual([]);
});

test("readable storage with failed writes keeps the in-memory answer and reports it", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("Quota", "QuotaExceededError");
    };
  });
  await page.goto("hsk1/hsk1-0001/");
  await page.locator("[data-learned-id]").click();
  await expect(page.locator("[data-learned-id]")).toHaveAttribute(
    "aria-pressed",
    "true",
  );
  await expect(page.locator("[data-progress-storage]")).toBeVisible();
  await expect(page.locator("[data-learning-announcement]")).not.toHaveText("");
});

test("audio stop, replacement and stale speech callbacks keep a single active control", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.__utterances = [];
    Object.defineProperty(window, "speechSynthesis", {
      value: {
        getVoices: () => [],
        cancel() {},
        speak(utterance) {
          window.__utterances.push(utterance);
        },
      },
    });
  });
  await page.goto("hsk1/hsk1-0001/");
  const buttons = page.locator("[data-speak]");
  await buttons.nth(0).click();
  await expect(buttons.nth(0)).toHaveAttribute("aria-pressed", "true");
  await buttons.nth(1).click();
  await expect(buttons.nth(0)).toHaveAttribute("aria-pressed", "false");
  await page.evaluate(() => window.__utterances[0].onend());
  await expect(buttons.nth(1)).toHaveAttribute("aria-pressed", "true");
  await buttons.nth(1).click();
  await expect(page.locator("[data-speak][aria-pressed=true]")).toHaveCount(0);
});

test("missing pronunciation is announced and dismissible without a timeout", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(window, "speechSynthesis", {
      value: { getVoices: () => [{ lang: "en-US" }], cancel() {} },
    }),
  );
  await page.goto("hsk1/hsk1-0001/");
  await page.locator("[data-speak]").first().click();
  await expect(page.locator("[data-audio-status]")).toBeVisible();
  await expect(page.locator("[data-learning-announcement]")).toHaveText(
    await page.locator("[data-audio-message]").textContent(),
  );
  await page.locator("[data-audio-dismiss]").click();
  await expect(page.locator("[data-audio-status]")).toBeHidden();
  await expect(page.locator("[data-speak]").first()).toBeFocused();
});

test("pager boundaries keep next on the right and expose unavailable destinations", async ({
  page,
}) => {
  await page.goto("hsk1/lesson/1/");
  await expect(page.locator(".page-pager [aria-disabled=true]")).toHaveCount(1);
  const next = page.locator(".page-pager [rel=next]");
  expect(
    await next.evaluate((el) => el.getBoundingClientRect().left),
  ).toBeGreaterThan(
    await page
      .locator(".page-pager")
      .evaluate((el) => el.getBoundingClientRect().left),
  );
  await next.click();
  await expect(page.locator(".page-pager [rel=prev]")).toHaveAttribute(
    "href",
    /\/lesson\/1\//,
  );
});

test("floating tabs wait for the closing keyboard viewport to recover", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("search/");
  await page.evaluate(() => {
    Object.defineProperty(window.visualViewport, "height", {
      configurable: true,
      get: () => innerHeight - 300,
    });
  });
  await page.locator("#q").focus();
  await expect(page.locator("#site-nav")).toBeHidden();
  await page.locator("#q").press("Enter");
  await expect(page.locator("#site-nav")).toBeHidden();
  await page.evaluate(() => {
    Object.defineProperty(window.visualViewport, "height", {
      configurable: true,
      get: () => innerHeight,
    });
    window.visualViewport.dispatchEvent(new Event("resize"));
  });
  await expect(page.locator("#site-nav")).toBeVisible();
});

test("revealed flashcard answers remain above the floating tabs on iPhone-sized screens", async ({
  page,
}) => {
  for (const [width, height] of [
    [375, 667],
    [390, 844],
    [393, 852],
    [402, 874],
    [430, 932],
  ]) {
    await page.setViewportSize({ width, height });
    await page.goto("hsk1/lesson/1/flashcards/");
    await page.locator("[data-card]:visible [data-flip]").click();
    const answer = await page.locator("[data-answer]").boundingBox();
    const nav = await page.locator("#site-nav").boundingBox();
    expect(
      answer.y + answer.height,
      `${width} answer visibility`,
    ).toBeLessThanOrEqual(nav.y - 4);
  }
});

test("safe-area clearance and last-page links remain reachable above mobile chrome", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("hsk1/hsk1-0300/");
  await page.addStyleTag({ content: ":root { --safe-bottom: 34px; }" });
  const nav = await page.locator("#site-nav").boundingBox();
  expect(844 - nav.y - nav.height).toBeCloseTo(42, 0);
  await page.locator(".page-pager [rel=prev]").focus();
  const previous = await page.locator(".page-pager [rel=prev]").boundingBox();
  expect(previous.y + previous.height).toBeLessThanOrEqual(nav.y);
});

test("recorded-audio fallback is single-shot and cannot interrupt a newer word", async ({
  page,
}) => {
  await page.addInitScript(() => {
    window.__media = [];
    window.__spoken = [];
    window.Audio = class {
      constructor(src) {
        this.src = src;
        window.__media.push(this);
      }
      play() {
        return new Promise((resolve, reject) => {
          this.reject = reject;
        });
      }
      pause() {
        this.paused = true;
      }
    };
    Object.defineProperty(window, "speechSynthesis", {
      value: {
        getVoices: () => [],
        cancel() {},
        speak(utterance) {
          window.__spoken.push(utterance.text);
        },
      },
    });
  });
  await page.goto("hsk1/hsk1-0001/");
  await page
    .locator("[data-speak]")
    .first()
    .evaluate((el) => {
      el.dataset.audio = "recorded.mp3";
    });
  await page.locator("[data-speak]").first().click();
  await page.locator("[data-speak]").nth(1).click();
  await page.evaluate(() => {
    window.__media[0].onerror();
    window.__media[0].reject(new Error("failed"));
  });
  expect(await page.evaluate(() => window.__media[0].paused)).toBe(true);
  expect(await page.evaluate(() => window.__spoken.length)).toBe(1);
  await expect(page.locator("[data-speak]").nth(1)).toHaveAttribute(
    "aria-pressed",
    "true",
  );
});

test("increased contrast and reduced transparency keep chrome readable", async ({
  page,
}) => {
  await page.goto("./");
  await page.emulateMedia({ contrast: "more" });
  expect(
    await page
      .locator("#site-nav")
      .evaluate((el) => getComputedStyle(el).backdropFilter),
  ).toBe("none");
  const session = await page.context().newCDPSession(page);
  await session.send("Emulation.setEmulatedMedia", {
    features: [{ name: "prefers-reduced-transparency", value: "reduce" }],
  });
  expect(
    await page
      .locator("#site-nav")
      .evaluate((el) => getComputedStyle(el).backdropFilter),
  ).toBe("none");
});

test("advancing a flashcard stops its pronunciation and clears its playing state", async ({
  page,
}) => {
  await page.addInitScript(() =>
    Object.defineProperty(window, "speechSynthesis", {
      value: { getVoices: () => [], cancel() {}, speak() {} },
    }),
  );
  await page.goto("hsk1/lesson/1/flashcards/");
  await page.locator("[data-card]:visible [data-flip]").click();
  await page.locator("[data-card]:visible [data-speak]").click();
  await expect(page.locator("[data-speak][aria-pressed=true]")).toHaveCount(1);
  await page.locator("[data-known=true]").click();
  await expect(page.locator("[data-speak][aria-pressed=true]")).toHaveCount(0);
});

test("appearance sheet does not scroll the background or move page width", async ({
  page,
}) => {
  await page.goto("./");
  await page.evaluate(() => scrollTo(0, 400));
  const before = await page.evaluate(() => ({
    y: scrollY,
    width: document.body.clientWidth,
  }));
  // A real pointer uses the visible sticky toolbar; locator.click first scrolls
  // its DOM position into view, which would itself reset the test's scroll.
  const trigger = await page.locator("[data-appearance-open]").boundingBox();
  await page.mouse.click(
    trigger.x + trigger.width / 2,
    trigger.y + trigger.height / 2,
  );
  await page.mouse.move(3, 200);
  await page.mouse.wheel(0, 200);
  expect(
    await page.evaluate(
      () =>
        document.documentElement.style.overflow ||
        getComputedStyle(document.documentElement).overflow,
    ),
  ).toBe("hidden");
  await page.keyboard.press("Escape");
  expect(
    await page.evaluate(() => ({
      y: scrollY,
      width: document.body.clientWidth,
    })),
  ).toEqual(before);
});

test("200 percent text and long Myanmar content keep navigation and actions reachable at 320px", async ({
  page,
}) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("hsk1/hsk1-0001/");
  await page.addStyleTag({ content: "html { font-size: 200%; }" });
  await page
    .locator(".meaning")
    .first()
    .evaluate((el) => {
      el.textContent =
        "မြန်မာစာကို နေ့တိုင်း နည်းနည်းချင်း လေ့လာကြမယ်။ ".repeat(30);
    });
  await expect
    .poll(() =>
      page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),
    )
    .toBe(true);
  await page.locator(".page-pager [rel=next]").focus();
  const action = await page.locator(".page-pager [rel=next]").boundingBox();
  const nav = await page.locator("#site-nav").boundingBox();
  expect(action.y + action.height).toBeLessThanOrEqual(nav.y);
  expect(
    await page
      .locator("#site-nav a")
      .evaluateAll((links) =>
        links.every((link) => link.getBoundingClientRect().width >= 44),
      ),
  ).toBe(true);
});
