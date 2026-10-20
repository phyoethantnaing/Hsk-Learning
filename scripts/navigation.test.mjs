import assert from "node:assert/strict";
import { navigationSection, NAV_ITEMS } from "../src/lib/navigation.mjs";
for (const path of [
  "/hsk1/",
  "/hsk1/hsk1-0001/",
  "/hsk1/lesson/2/",
  "/start/",
  "/hsk7-9/",
])
  assert.equal(navigationSection(path), "learn", path);
for (const path of [
  "/flashcards/",
  "/hsk1/lesson/2/flashcards/",
  "/hsk1/lesson/15/flashcards",
])
  assert.equal(navigationSection(path), "cards", path);
assert.equal(navigationSection("/"), "home");
assert.equal(navigationSection("/search/"), "search");
assert.equal(navigationSection("/about/"), null);
assert.equal(navigationSection("/404.html"), null);
assert.equal(new Set(NAV_ITEMS.map((x) => x.key)).size, NAV_ITEMS.length);
