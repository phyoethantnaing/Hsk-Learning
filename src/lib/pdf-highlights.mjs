export const HIGHLIGHT_COLORS = ["gold", "red", "yellow", "graphite"];
export const MAX_HIGHLIGHTS = 1000;
export function highlightKey(fingerprint) {
  return `hsk-mm-pdf-highlights-v1:${fingerprint}`;
}
export function validHighlight(item, pageCount) {
  return (
    item &&
    typeof item.id === "string" &&
    item.id.length <= 100 &&
    Number.isInteger(item.page) &&
    item.page >= 1 &&
    item.page <= pageCount &&
    HIGHLIGHT_COLORS.includes(item.color) &&
    typeof item.text === "string" &&
    item.text.length > 0 &&
    item.text.length <= 4000 &&
    Array.isArray(item.rects) &&
    item.rects.length > 0 &&
    item.rects.length <= 200 &&
    item.rects.every(
      (rect) =>
        Array.isArray(rect) &&
        rect.length === 4 &&
        rect.every(Number.isFinite) &&
        rect[0] >= 0 &&
        rect[1] >= 0 &&
        rect[2] > 0 &&
        rect[3] > 0 &&
        rect[0] + rect[2] <= 1.001 &&
        rect[1] + rect[3] <= 1.001,
    )
  );
}
export function decodeHighlights(raw, pageCount) {
  if (raw === null) return [];
  const data = JSON.parse(raw);
  if (
    data?.version !== 1 ||
    !Array.isArray(data.items) ||
    data.items.length > MAX_HIGHLIGHTS ||
    !data.items.every((item) => validHighlight(item, pageCount)) ||
    new Set(data.items.map((item) => item.id)).size !== data.items.length
  ) {
    throw new Error("Invalid saved highlights");
  }
  return data.items;
}
export function normalizeRects(rectangles, paper) {
  return rectangles.flatMap((rect) => {
    const left = Math.max(0, (rect.left - paper.left) / paper.width);
    const top = Math.max(0, (rect.top - paper.top) / paper.height);
    const right = Math.min(1, (rect.right - paper.left) / paper.width);
    const bottom = Math.min(1, (rect.bottom - paper.top) / paper.height);
    return right - left > 0.0001 && bottom - top > 0.0001
      ? [[left, top, right - left, bottom - top]]
      : [];
  });
}
