// One hierarchy for desktop navigation and the mobile tab bar. Native links keep
// browser history, scroll restoration, deep links, and open-in-new-tab intact.
export const NAV_ITEMS = [
  { href: "/", label: "ပင်မ", icon: "home", key: "home" },
  { href: "/hsk1/", label: "သင်ခန်းစာ", icon: "book", key: "learn" },
  { href: "/search/", label: "ရှာရန်", icon: "search", key: "search" },
  { href: "/flashcards/", label: "ကတ်ပြား", icon: "cards", key: "cards" },
];
export function navigationSection(path) {
  if (/\/flashcards(?:\/|$)/.test(path)) return "cards";
  if (/\/search(?:\/|$)/.test(path)) return "search";
  if (/\/(?:hsk[1-6]|hsk7-9|start|library|reader)(?:\/|$)/.test(path)) return "learn";
  if (path === "/" || path === "") return "home";
  return null;
}
