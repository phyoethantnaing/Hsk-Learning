# UI/UX quality recovery

## Reference review

Reviewed Apple's current Human Interface Guidelines, Materials, Liquid Glass
technology overview, Tab Bars, Search Fields, Icons and Accessibility guidance on
2026-10-20. The Design Resources page lists the iOS/iPadOS 27 UI kit; its official
preview was used as a visual reference. No Apple icons, fonts, UI kit assets or
native UIKit/SwiftUI materials are distributed in this website.

- https://developer.apple.com/design/human-interface-guidelines/
- https://developer.apple.com/design/resources/#ios-apps
- https://developer.apple.com/documentation/TechnologyOverviews/liquid-glass
- https://developer.apple.com/design/human-interface-guidelines/materials
- https://developer.apple.com/design/human-interface-guidelines/tab-bars
- https://developer.apple.com/design/human-interface-guidelines/search-fields
- https://developer.apple.com/design/human-interface-guidelines/accessibility

The implementation uses CSS to approximate the hierarchy and interaction of the
material: glass for navigation, quieter surfaces for educational content, compact
contextual controls, persistent labeled destinations, and explicit accessibility
fallbacks. It does not attempt expensive optical refraction.

## Issue checklist and fixes

| ID | Finding / root cause | Correction and verification |
| --- | --- | --- |
| N1 | Lesson, word-detail and nested flashcard routes had no selected navigation item; exact URL matching only. | Shared route hierarchy selects Learning or Flashcards, with `aria-current=page` on exact destinations and `true` within a section. Unit, browser and exhaustive route checks. |
| N2 | Learning lacked a primary navigation destination; mobile navigation required opening a menu. | Four persistent labeled destinations; desktop capsule and mobile floating tab bar use the same native links. No redundant hamburger or duplicate navigation. |
| N3 | The mobile theme select clipped its long system label and competed for header width. | Appearance sheet with full labels, native radio keyboard behavior, Escape, modal focus containment and focus return. |
| N4 | First-lesson Next aligned left, while later lessons placed it right. | Shared two-column pager with noninteractive boundary states and consistent previous/next icons. |
| I1 | UI controls mixed emoji, text checkmarks/arrows and vectors; some icons had ambiguous meaning. | Original 24px vector family, consistent stroke and optical spacing; explicit audio/stop, check, close, back, next, retry, tag, pen and link icons. Educational prose and vocabulary are preserved. |
| I2 | A link vector extended outside its viewBox during refinement. | Corrected geometry; all rendered and hidden-state vectors measured against the shared grid. Unknown icon names fail the build instead of silently substituting a book. |
| S1 | Typed search queries were absent from the URL, losing results on refresh/Back. | Replace the query parameter without creating per-keystroke history entries; restore on navigation and BFCache return. Back/Forward and deep links tested. |
| S2 | A pending failed fetch could replace the empty state after the input was cleared. | Query-owned loading/error state and stale-request checks; explicit clear and retry controls. Deferred-failure regression test. |
| S3 | Editing with a Chinese IME searched unfinished compositions. | Defer search until composition commits, retain multilingual matching. |
| S5 | Exactly 50 search results were incorrectly labeled “50+”. | Render the exact count; distinguish the capped list only when the actual match count exceeds 50. |
| S4 | Small-screen search input could be below 16px, an iOS zoom trigger. | Stable 16px input and search keyboard hint; Enter dismisses editing. Physical Safari zoom is not claimed as tested. |
| P1 | `learned:null` or `cards:null` crashed learning controls. | Validate containers without changing the v1 key or valid timestamps, counters and unknown fields. Malformed-shape tests. |
| P2 | Readable storage with failed writes overwrote in-memory answers with stale saved data. | Cache the last loaded value, retain unsaved in-memory edits, and report actual save failure accessibly. |
| P3 | Clearing progress in another tab could leave stale ticks. | Invalidate on key changes/clear; refresh progress on `pageshow`. |
| A1 | Speech replacement could leave multiple controls appearing active; recorded audio instances had no shared cancellation. | One cancellable session, stop-on-repeat, stale callback protection, pause on navigation/hidden document/card change, single-shot speech fallback. |
| A3 | A generic zh voice fallback could choose a Cantonese voice ahead of Mandarin when Mainland Chinese was unavailable. | Mandarin locale selection is explicit and unit-tested; Singapore/Taiwan alternatives remain supported. |
| A2 | Speech failures could be silent; the long no-voice message disappeared on a fixed timer. | Accessible playing/stopped state, error status with explicit dismissal, focus return to the originating control; no reading timeout. Audio and save errors update an always-present live region outside hidden visual feedback. |
| F1 | Flashcard headings/intro consumed too much mobile space, and revealed answers could sit beneath bottom chrome. | Compact lesson context, reserved answer slot, stable flexible card area; reveal brings answers into view only when necessary. Small-screen visibility test. |
| F2 | Pronunciation could continue after advancing a flashcard. | Card-change cancellation and regression coverage. |
| V1 | The mobile hero pushed learning access far below the first screen. | Compact interactive vocabulary preview on phones; desktop composition retains room for the larger preview. |
| V2 | Homepage wording implied all 11,000 words had Myanmar content although only 300 are published. | Present actual published HSK 1 count; upcoming levels remain unlinked. No vocabulary JSON changes. |
| M1 | Decorative/content surfaces used the same glass treatment as navigation. | Reserve backdrop blur for the navigation layer; standard content cards and readable search field. |
| X2 | Production CSS optimization could drop the usable blur-disable declaration, despite an active contrast preference. | Explicit supported CSS targets and correct prefixed declaration ordering; rendered increased-contrast and reduced-transparency tests. |
| X1 | No increased-contrast treatment; small breadcrumb touch areas and inconsistent disabled/pressed states. | 44px controls, readable focus and states, contrast/reduced-transparency/forced-color fallbacks, safe-area and keyboard-aware chrome. |

## Reproduce verification

Use the supported Node engine and lockfile:

```sh
npm ci
npm run validate
npm run check-vocab
npm test
npm run build
npx playwright install --with-deps chromium
npm run test:ui
npm run preview
# In another shell, after preview is ready:
npm run audit:ui
```

`PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` selects an installed Chromium. Keep `dist/`
stable during checks; rebuilding while browser tests run deletes in-flight static
assets and invalidates that run. `AUDIT_BASE_URL` can select a verified deployment.
The exhaustive audit generates `artifacts/audit/exhaustive-ui.json`: every generated
HTML route at mobile/light, mobile/dark, desktop/light and desktop/dark, plus the
specified device matrix and two phone landscape widths. It checks runtime errors,
heading structure, active sections, overflow, control targets and icon bounds.

Browser tests also cover live learning behavior, search recovery/history,
legacy/malformed/blocked storage, theme radios/focus, audio cancellation/fallback,
flashcard completion/retry/restart, safe-area clearance, answer visibility,
keyboard editing, text resizing, no-JavaScript reading, local fonts, reduced
motion and increased contrast.

## Scope and limits

The vocabulary data, IDs, translations, lesson grouping, v1 storage keys, base path
and Astro deployment workflow are retained. No backend, authentication, service
worker or gesture-only action was added. Already loaded search data continues to
work offline in that page; this is not a full offline PWA.

Safe-area and visual-keyboard behavior are emulated and geometry-checked. Actual
iOS Safari, VoiceOver, installed web-app browser chrome and audible pronunciation
on physical devices are not available in this environment. The report must not
represent Chromium emulation as physical device verification. Automated WCAG
checks supplement visual and keyboard review, not a complete conformance claim.

## Component/state review matrix

All rows were reviewed for alignment, placement, dimensions, spacing, typography,
line height/wrapping, color, edge/shadow/material hierarchy, targets, hover/pressed/
selected/focus/disabled appearance, scrolling/motion, loading/error behavior,
responsive layout, keyboard/screen-reader semantics, both appearances, resource
cost and actual behavior. A state that the component does not expose is N/A;
artificial loading/disabled behaviors were not added to static educational text.

| Component / route family | State coverage |
| --- | --- |
| Header, brand, utilities and four navigation links | All section routes, exact/nested active, Back/Forward, focus, safe area, keyboard viewport, no JS, mobile/desktop layouts |
| Appearance sheet | Closed/open, all radios, system changes, manual persistence, Escape, backdrop dismissal, focus containment/return, scroll lock |
| Homepage and published/upcoming levels | Published count, disabled availability, saved progress, compact/large hero, working pronunciation preview |
| Level lesson list and flashcard lesson picker | All 15 lessons, previews, progress, destination links, hover/focus |
| Lesson vocabulary grids | All 300 words across all 15 lessons, long meanings, saved ticks, small screen/text zoom |
| Word details, script toggle and related links | All 300 generated detail routes, simplified/traditional, Pinyin, tone chips, pronunciation, explanation, examples, draft badge, related words |
| Page pager | First/middle/last lesson and word, consistent direction, disabled edges, keyboard access |
| Beginner guide | All sections and five pitch diagrams; tone names and contours supplement color; audio examples |
| Search | Initial, composition, loading, result count, many/no results, clear, network failure, explicit retry, stale request, URL restore, keyboard dismissal |
| Flashcard face and answers | Front/back, known/unknown, next card, long text, answer visibility, complete, retry only unknown, restart, reduced motion, audio cancellation |
| Learned toggle and progress | Old saved data, malformed containers, storage failure, normal persistence, cross-tab invalidation, progressbar values, selected and unselected states |
| Audio controls and status | Idle/playing/stop, replace, canceled/stale callbacks, recorded failure fallback, no voice, error dismissal and focus return |
| Footer, About and 404 | Licensing, guide/about links, long multilingual text, recovery action, bottom clearance |
| Global accessibility fallbacks | Focus indicators, reduced motion, reduced transparency, increased contrast, forced colors and solid material fallback |

Screenshots and machine-readable results are generated under `artifacts/audit/`
and deliberately excluded from the source tree. The release report records the
actual successful check counts, PR, merge SHA and production evidence.
