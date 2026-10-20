import assert from "node:assert/strict";
const key = "hsk-mm-progress-v1";
let count = 0;
async function scenario(raw, writing = true) {
  const storage = new Map(raw === undefined ? [] : [[key, raw]]);
  const events = new Map();
  globalThis.localStorage = {
    getItem: (k) => storage.get(k) ?? null,
    setItem: (k, v) => {
      if (!writing) throw new Error("Quota");
      storage.set(k, v);
    },
  };
  globalThis.document = {
    querySelector: () => null,
    dispatchEvent() {},
    addEventListener() {},
  };
  globalThis.window = {
    addEventListener: (event, handler) => events.set(event, handler),
  };
  const api = await import(`../src/scripts/progress.js?case=${++count}`);
  return { api, storage, events };
}
const old = {
  learned: { old: 123 },
  cards: { old: { known: 3, unknown: 2, last: 123, extra: true } },
  versionNote: "keep",
};
{
  const { api, storage } = await scenario(JSON.stringify(old));
  api.isLearned("old");
  storage.set(
    key,
    JSON.stringify({ ...old, learned: { old: 123, otherTab: 456 } }),
  );
  api.setLearned("local", true);
  assert.equal(
    JSON.parse(storage.get(key)).learned.otherTab,
    456,
    "a mutation must retain a newer saved update even before its storage event arrives",
  );
}
{
  const { api, storage } = await scenario(JSON.stringify(old));
  api.setLearned("new", true);
  api.recordCard("old", true);
  const saved = JSON.parse(storage.get(key));
  assert.equal(saved.learned.old, 123);
  assert.equal(saved.cards.old.known, 4);
  assert.equal(saved.cards.old.extra, true);
  assert.equal(saved.versionNote, "keep");
}
for (const raw of [
  "null",
  "{}",
  "[]",
  "bad json",
  '{"learned":null,"cards":null}',
  '{"learned":[],"cards":{"new":null}}',
]) {
  const { api } = await scenario(raw);
  api.setLearned("new", true);
  api.recordCard("new", true);
  assert.equal(api.isLearned("new"), true, raw);
}
{
  const { api, events, storage } = await scenario(JSON.stringify(old));
  api.onProgress(() => api.countLearned(["old"]));
  assert.equal(api.isLearned("old"), true);
  storage.clear();
  events.get("storage")({ key: null });
  assert.equal(api.isLearned("old"), false);
}
{
  const { api } = await scenario(JSON.stringify(old), false);
  api.setLearned("new", true);
  assert.equal(
    api.isLearned("new"),
    true,
    "failed writes must not be overwritten by stale readable storage",
  );
  assert.equal(api.isLearned("old"), true);
}
