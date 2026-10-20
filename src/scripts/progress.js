// Learning progress kept in this browser only (localStorage). Every access is
// wrapped in try/catch: private windows or blocked storage just mean progress
// is not remembered, and the site still works.
//
// Stored shape (key below):
//   { learned: { [wordId]: timestamp }, cards: { [wordId]: { known, unknown, last } } }

const KEY = 'hsk-mm-progress-v1';
let memory = { learned: {}, cards: {} };

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) memory = { learned: {}, cards: {}, ...JSON.parse(raw) };
  } catch {
    /* storage unavailable: keep the in-memory copy */
  }
  return memory;
}

function save() {
  try {
    localStorage.setItem(KEY, JSON.stringify(memory));
  } catch {
    /* storage unavailable or full */
  }
  document.dispatchEvent(new CustomEvent('progress-changed'));
}

export function isLearned(id) {
  return Boolean(load().learned[id]);
}

export function setLearned(id, learned) {
  load();
  if (learned) memory.learned[id] = Date.now();
  else delete memory.learned[id];
  save();
}

export function countLearned(ids) {
  const learned = load().learned;
  return ids.filter((id) => learned[id]).length;
}

/** Record a flashcard answer. "I know it" also marks the word as learned. */
export function recordCard(id, known) {
  load();
  const c = memory.cards[id] ?? { known: 0, unknown: 0, last: 0 };
  if (known) c.known++;
  else c.unknown++;
  c.last = Date.now();
  memory.cards[id] = c;
  if (known) memory.learned[id] = memory.learned[id] ?? Date.now();
  save();
}

/** Re-run `render` now and whenever progress changes (also from other tabs). */
export function onProgress(render) {
  render();
  document.addEventListener('progress-changed', render);
  window.addEventListener('storage', (e) => {
    if (e.key === KEY) render();
  });
}
