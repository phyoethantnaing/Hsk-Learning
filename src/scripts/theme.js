// This preference is independent of the existing learning-progress storage.
const KEY = "hsk-mm-theme-v1";
const system = matchMedia("(prefers-color-scheme: dark)");
const select = document.querySelector("[data-theme-select]");
let preference = "system";
try {
  preference = localStorage.getItem(KEY) || "system";
} catch {
  /* in-memory preference */
}
if (!["light", "dark", "system"].includes(preference)) preference = "system";
function apply() {
  const theme =
    preference === "system" ? (system.matches ? "dark" : "light") : preference;
  document.documentElement.dataset.theme = theme;
  if (select) select.value = preference;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", theme === "dark" ? "#111113" : "#f7f7f8");
}
select?.addEventListener("change", () => {
  preference = select.value;
  try {
    localStorage.setItem(KEY, preference);
  } catch {
    /* storage may be unavailable */
  }
  apply();
});
system.addEventListener("change", apply);
window.addEventListener("storage", (event) => {
  if (event.key !== KEY) return;
  preference = ["light", "dark"].includes(event.newValue)
    ? event.newValue
    : "system";
  apply();
});
apply();
