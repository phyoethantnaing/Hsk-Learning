# Touch responsiveness, performance and Chinese gold

This is a refinement of the existing Astro UI. No framework, backend, runtime
library, vocabulary edit, storage-key migration or deployment-workflow change is
introduced. Native links and semantic controls remain responsible for activation.

## Reproduced defects

| Finding | Evidence before | Fix / regression coverage |
| --- | --- | --- |
| Learned action looked enabled before its external module was ready. | Holding its module request and sending one real touch left `aria-pressed=false`, including after initialization. The first intent was dropped. | Busy/disabled state until the handler is installed; the first valid coordinate tap updates exactly once. No event replay or double-tap workaround. |
| Search initialization erased text entered while the module loaded. | Typed `love` became an empty value when the held module was released. | Retain the user's early input, search it and synchronize its URL. Suggestion buttons expose readiness until their handlers are installed. |
| Tabs returned as soon as input blurred, even while the keyboard still reduced the viewport. | Simulated visual-viewport reduction plus Enter/blur made the floating bar reappear prematurely. | Keep chrome hidden until viewport recovery, and ignore pinch-zoom geometry. This is a browser geometry regression test, not physical Safari verification. |

Fully initialized native navigation and audio controls responded to the initial
center/edge touch probe. No general invisible glass overlay or duplicate
navigation click handler was found. Physical iOS-only causes cannot be ruled out
by Chromium tests.

## Input and rendering changes

- Stable outer hit targets: pressed states change color/border immediately instead
  of shrinking the target. Interactive cards and the appearance sheet no longer
  translate under a finger. Flashcard answer faces use only a short opacity fade.
- `touch-action: manipulation` on controls preserves pan and pinch zoom. No touch
  cancellation, scroll prevention, navigation interception or pointerdown action
  is added. Decorative vectors/orbits/labels cannot intercept pointer events.
- Progress reads one cached snapshot for rendering. Native storage/BFCache events
  invalidate it once for all subscribers. Every mutation rechecks the latest
  saved value, retaining another tab's update even if its event is still queued.
  Failed writes retain in-memory edits; v1 keys, valid timestamps/counters and
  unknown metadata are preserved.
- Progress references and IDs are cached; unchanged counts skip DOM writes.
  Progress fills animate `scaleX`, avoiding a width-driven layout animation.
- Flashcards change only previous/current card visibility, rather than rewriting
  hidden state on every card. No additional gesture or input dependency is added.
- The chrome observer reads both boxes before style writes, and writes only when
  dimensions change. There is no scroll listener.
- Glass remains on navigation only: blur is 12px rather than 20px, saturation is
  lower, shadows are quieter, and shadows are not animated. Reduced motion,
  transparency, increased contrast, solid fallbacks and forced colors remain.
- Repeated completed search queries skip redundant result reconstruction (including
  duplicate composition/input notifications). Query changes, loading/error/retry,
  history, multilingual matching and native form fallback are retained.

## Gold system

Red still identifies actions and active destinations. Gold marks the available
learning path, small heading details, selected-navigation hairlines, learned
states, completed progress and flashcard completion. Content surfaces remain
white/black; there are no metallic panels, extra images or nested glass layers.

| Token | Light | Dark | Purpose |
| --- | --- | --- | --- |
| `--gold` | `#805c1a` | `#dfbf75` | Readable small text and achievement icons |
| `--gold-edge` | `#b18a3e` | `#987a40` | Fine selection/completion border |
| `--gold-soft` | `#fbf4e3` | `#30291d` | Quiet achievement surface |
| `--gold-glint` | gold at 12% | gold at 10% | Small reflection within existing navigation |

The darker light-mode text gold is deliberate: the suggested decorative gold
`#c9a24d` is too light for small text on white. Focus stays red, and achievement is
also expressed through labels, checkmarks, counts and semantic selected states.

## Reproducible performance measurement

After building and starting preview, run:

```sh
npm run profile:ui
# Optional environment variables:
# PROFILE_BASE_URL=http://localhost:4321/Hsk-Learning/
# PROFILE_STAGE=after
# PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium
```

The script records three independent contexts at normal CPU and 4× slowdown,
covering learning/audio/script toggle, five flashcard answers, search typing and
clear, appearance changes, and a 30-frame synthetic scroll. Keep builds stable
and other browser workloads stopped during profiling. The baseline uses commit
`d5038b75af6fcad73d15327f89d30e9a256c2a9a` served from an isolated checkout.

Event Timing captures durations >=16ms, input delay and processing intervals.
The reported worst event is a lab interaction proxy, not field INP. Processing
includes event/default work, not an exclusive JS CPU sample. Observed blocking is
sum(max(long-task duration − 50ms, 0)) over the recorded visit, not Lighthouse TBT.
Startup DOMContentLoaded/long tasks, CLS and scroll rAF gaps are retained in JSON.
Audio playback is stubbed; this does not measure real voice availability or sound.

The run-to-run results are mixed and VM scheduling matters. Do not advertise a
uniform speedup, guaranteed 60 FPS or verified field INP. The release QA artifact
contains complete before/after rows, including regressions and raw observations.

## Verification and limits

Run `npm ci`, `npm run validate`, `npm run check-vocab`, `npm test`,
`npm run build`, `npm run test:ui`, and `npm run audit:ui`.
`AUDIT_OUTPUT` can isolate an exhaustive audit's artifact directory. The audit
reuses already verified identical vector-path geometry to avoid thousands of
unnecessary forced layouts in the QA harness; route/hit-target checks remain.

Coordinate touch tests send one touch without locator activation retries. They
cover navigation, level/lesson/word/pager/results links, deferred initialization,
rapid flashcard answers, audio stop, script choice, appearance, and actual
cross-tab storage invalidation. Existing tests retain responsive, text-zoom,
safe-area, keyboard, saved-progress, no-JavaScript and accessibility coverage.

Actual iPhone Safari, VoiceOver, installed web-app chrome and physical audio are
not available. Safe-area/keyboard tests are emulated. Automated accessibility
checks supplement review and do not certify complete WCAG compliance. The site
has no full offline service worker; previously loaded search data works offline.
