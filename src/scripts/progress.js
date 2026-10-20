// Backward-compatible browser progress. Keep the v1 key, IDs, timestamps and
// unknown fields; malformed containers must never break a learning control.
const KEY = "hsk-mm-progress-v1";
const empty = () => ({ learned: {}, cards: {} });
const record = (value) =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));
let memory = empty();
let loaded = false;
let lastRaw;
function decode(raw) {
  try {
    const data = JSON.parse(raw);
    return record(data)
      ? {
          ...data,
          learned: record(data.learned) ? data.learned : {},
          cards: record(data.cards) ? data.cards : {},
        }
      : empty();
  } catch {
    return empty();
  }
}
function load(refresh = false) {
  if (loaded && !refresh) return memory;
  loaded = true;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw !== lastRaw) {
      memory = decode(raw);
      lastRaw = raw;
    }
  } catch {
    /* unavailable storage: continue using memory */
  }
  return memory;
}
function save() {
  let persisted = false;
  try {
    const raw = JSON.stringify(memory);
    localStorage.setItem(KEY, raw);
    lastRaw = raw;
    persisted = true;
  } catch {
    /* memory stays usable even when reading works but writing fails */
  }
  const status = document.querySelector("[data-progress-storage]");
  if (status) {
    status.hidden = persisted;
    status.textContent = persisted
      ? ""
      : "ဒီဘရောက်ဇာမှာ တိုးတက်မှုကို မသိမ်းနိုင်ပါ။ ဒီစာမျက်နှာမှာ ဆက်လေ့လာနိုင်ပါတယ်။";
  }
  const announcement = document.querySelector("[data-learning-announcement]");
  if (announcement) announcement.textContent = status?.textContent || "";
  document.dispatchEvent(new CustomEvent("progress-changed"));
}
export function isLearned(id) {
  return Boolean(load().learned[id]);
}
export function setLearned(id, learned) {
  // Recheck before a write: another tab's storage event may still be queued.
  load(true);
  if (learned) memory.learned[id] = Date.now();
  else delete memory.learned[id];
  save();
}
export function countLearned(ids) {
  const learned = load().learned;
  return ids.filter((id) => learned[id]).length;
}
export function recordCard(id, known) {
  load(true);
  const original = memory.cards[id];
  const card = record(original) ? { ...original } : {};
  const count = (value) => (Number.isFinite(value) && value >= 0 ? value : 0);
  card.known = count(card.known) + (known ? 1 : 0);
  card.unknown = count(card.unknown) + (known ? 0 : 1);
  card.last = Date.now();
  memory.cards[id] = card;
  if (known) memory.learned[id] = memory.learned[id] ?? Date.now();
  save();
}
export function onProgress(render) {
  render();
  document.addEventListener("progress-changed", render);
}
// One invalidation per browser event, shared by every progress subscriber.
window.addEventListener("storage", (event) => {
  if (event.key === KEY || event.key === null) {
    loaded = false;
    document.dispatchEvent(new CustomEvent("progress-changed"));
  }
});
window.addEventListener("pageshow", (event) => {
  if (!event.persisted) return;
  loaded = false;
  document.dispatchEvent(new CustomEvent("progress-changed"));
});
