import test from "node:test";
import assert from "node:assert/strict";
import {
  highlightKey,
  decodeHighlights,
  normalizeRects,
  validHighlight,
} from "../src/lib/pdf-highlights.mjs";
const item = {
  id: "test",
  page: 2,
  color: "gold",
  text: "你好 nǐ hǎo မင်္ဂလာပါ",
  rects: [[0.1, 0.2, 0.3, 0.04]],
};
test("PDF highlights validate Unicode and reject corrupt or unsafe storage", () => {
  assert.deepEqual(
    decodeHighlights(JSON.stringify({ version: 1, items: [item] }), 3),
    [item],
  );
  assert.deepEqual(decodeHighlights(null, 3), []);
  for (const bad of [
    "broken",
    '{"version":2,"items":[]}',
    JSON.stringify({ version: 1, items: [item, item] }),
    JSON.stringify({ version: 1, items: [{ ...item, rects: [[0, 0, 2, 1]] }] }),
  ])
    assert.throws(() => decodeHighlights(bad, 3));
  assert.equal(validHighlight({ ...item, page: 4 }, 3), false);
  assert.equal(validHighlight({ ...item, color: "url(script)" }, 3), false);
  assert.equal(validHighlight({ ...item, rects: [[0, 0, NaN, 1]] }, 3), false);
  assert.match(highlightKey("hash"), /^hsk-mm-pdf-highlights-v1:hash$/);
  assert.notEqual(highlightKey("hash"), "hsk-mm-progress-v1");
});
test("selection rectangles remain normalized across viewport and zoom changes", () => {
  assert.deepEqual(
    normalizeRects([{ left: 20, top: 40, right: 60, bottom: 50 }], {
      left: 0,
      top: 0,
      width: 100,
      height: 100,
    }),
    [[0.2, 0.4, 0.39999999999999997, 0.09999999999999998]],
  );
  const clipped = normalizeRects(
    [
      { left: -10, top: -10, right: 50, bottom: 110 },
      { left: 200, top: 200, right: 220, bottom: 210 },
    ],
    { left: 0, top: 0, width: 100, height: 100 },
  );
  assert.deepEqual(clipped, [[0, 0, 0.5, 1]]);
});
