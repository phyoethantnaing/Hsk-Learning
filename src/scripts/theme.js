// Separate preference key: never touches learner progress.
const KEY = "hsk-mm-theme-v1";
const system = matchMedia("(prefers-color-scheme: dark)");
const choices = [...document.querySelectorAll("[data-theme-choice]")];
const dialog = document.querySelector("#appearance-dialog");
const trigger = document.querySelector("[data-appearance-open]");
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
  for (const choice of choices) choice.checked = choice.value === preference;
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", theme === "dark" ? "#111113" : "#f7f7f8");
}
for (const choice of choices)
  choice.addEventListener("change", () => {
    preference = choice.value;
    try {
      localStorage.setItem(KEY, preference);
    } catch {
      /* storage unavailable */
    }
    apply();
  });
system.addEventListener("change", apply);
window.addEventListener("storage", (event) => {
  if (event.key !== KEY && event.key !== null) return;
  preference = ["light", "dark"].includes(event.newValue)
    ? event.newValue
    : "system";
  apply();
});
trigger?.addEventListener("click", () => {
  dialog.showModal();
  choices.find((choice) => choice.checked)?.focus({ preventScroll: true });
});
document
  .querySelector("[data-appearance-close]")
  ?.addEventListener("click", () => dialog.close());
dialog?.addEventListener("click", (event) => {
  if (event.target !== dialog) return;
  const rect = dialog.getBoundingClientRect();
  if (
    event.clientX < rect.left ||
    event.clientX > rect.right ||
    event.clientY < rect.top ||
    event.clientY > rect.bottom
  )
    dialog.close();
});
dialog?.addEventListener("close", () =>
  trigger?.focus({ preventScroll: true }),
);
apply();
