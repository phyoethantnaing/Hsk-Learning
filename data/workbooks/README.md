# Workbooks (Phase 2)

Exercises will live here, one file per lesson: `data/workbooks/hsk1/lesson-01.json`,
an array of exercises following [`../schema/exercise.schema.json`](../schema/exercise.schema.json).

Exercise types:

| type | What the learner does |
|---|---|
| `multiple-choice` | Pick the right answer to a question (e.g. the meaning of a word) |
| `match` | Match each character with its Myanmar meaning (or pinyin) |
| `choose-tone` | Hear or see a syllable and pick its tone (1–4 or neutral) |
| `fill-blank` | Choose the word that completes a Chinese sentence |
| `listen-choose` | Listen to audio and pick the word or sentence you heard |

Every exercise lists the word ids it practises in `wordIds`; the word data points
back with `workbookRefs`. Myanmar text follows the same rules as word content
(docs/content-guide.md). No exercises have been written yet.
