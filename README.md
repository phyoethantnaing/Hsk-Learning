# HSK မြန်မာ — HSK 3.0 Vocabulary in Myanmar

**မြန်မာ:** တရုတ်စာ HSK 3.0 (၂၀၂၅) စကားလုံးတွေကို မြန်မာလို လွယ်လွယ်ကူကူ ကိုယ်တိုင်လေ့လာနိုင်တဲ့ အခမဲ့ ဝက်ဘ်ဆိုက်ပါ။ ရှင်းပြချက်တိုင်းကို အသက် ၁၀ နှစ်အရွယ် ကလေးတစ်ယောက် ဆရာမပါဘဲ နားလည်နိုင်အောင် ရေးထားပါတယ်။

**English:** A free, static website that teaches the Chinese HSK 3.0 (2025) vocabulary entirely in Myanmar (Burmese), written so that a 10-year-old can study alone.

Site: https://phyoethantnaing.github.io/Hsk-Learning/ (after the first deploy)

> Phase 1 (vocabulary) is live for HSK 1; other levels follow. Workbooks (Phase 2) and recorded audio (Phase 3) come later — the data formats are already in place.

## Site pages

| Page | What it does |
|---|---|
| `/` | Choose a level; progress per level |
| `/start/` | Beginner lessons: pinyin, the tones (with pitch diagrams and 🔊), tone marks, sounds Myanmar lacks, a daily routine |
| `/hsk1/` | Lessons of 20 words with progress |
| `/hsk1/lesson/1/` | The lesson's word cards |
| `/hsk1/lesson/1/flashcards/` | Flashcards (သိတယ် / မသိသေးဘူး) |
| `/hsk1/hsk1-0001/` | Word page: Simplified/Traditional, tone chips, all explanations, examples, related words, previous/next |
| `/search/` | Search by Chinese, pinyin (ài / ai4 / ai), Myanmar or English |
| `/flashcards/`, `/about/` | Flashcard lessons; data sources and licenses |

Progress (learned words, flashcard answers) is stored only in the learner's browser (`localStorage`).
🔊 uses the browser's Chinese voice until recorded audio exists (see `public/audio/README.md`).

## Run locally

Requires Node.js 22.22+ and Python 3. `pdftotext` (poppler) is only needed to re-parse the PDFs.

```sh
npm install
npm run dev        # http://localhost:4321/Hsk-Learning/
npm run build      # static site in dist/
```

## Data checks

| Command | What it does |
|---|---|
| `npm run sync-words` | Fills in fields copied from the official list and generated pinyin fields in `data/words/`. |
| `npm run parse-pdfs` | Re-extracts `source/pdfs/*.pdf` into `data/raw/*.json` and checks every level's word count. |
| `npm run validate` | Checks every word in `data/words/` against the schema and the official list, checks generated pinyin fields, and rejects Zawgyi-encoded text. |
| `npm run check-vocab` | Flags example-sentence words above the word's own HSK level. |
| `npm test` | Unit tests for the pinyin and Zawgyi helpers. |

CI runs all of these on every push and pull request.

## How the content is organised

```
source/pdfs/             official HSK 3.0 (2025) word lists (input)
data/raw/hsk{1..6,7-9}.json   parsed lists: id, simplified, traditional, pinyin, english
data/words/hsk1/hsk1-001-050.json   Myanmar learning content, 50 words per file
data/schema/word.schema.json   the format of one word entry
data/example-vocab-allowlist.json   proper nouns allowed in examples (缅甸, 仰光, 曼德勒)
data/workbooks/          Phase 2 exercises (schema: data/schema/exercise.schema.json)
public/audio/            Phase 3 recordings (naming: public/audio/README.md)
scripts/                 parser and checks
src/                     the Astro site
```

- **Word ids** are `hsk{level}-{number}` using the number from the official list (`hsk1-0001` = 爱). They never change.
- **`pinyinNumbered` / `tones`** are generated from `pinyin`: tone 5 means the neutral tone, ü is written `v` (`bàba` → `ba4 ba5`, tones `[4, 5]`).
- **`reviewStatus`** is `draft` until a person has checked the Myanmar text; the site marks draft words with a “စစ်ဆေးဆဲ” badge.
- **`needsReview: true`** marks entries whose *source data* is uncertain and must be checked against the printed syllabus (currently hsk4-0534 嗯 ǹg, where the PDF lost a glyph).

### Writing content

Follow [docs/content-guide.md](docs/content-guide.md): voice and style, what goes in each field, the pronunciation-tip format and the agreed Myanmar spellings for pinyin sounds.

### Reviewing a word

1. Open the batch file in `data/words/hsk{level}/`.
2. Fix the Myanmar text. Always type in **Myanmar Unicode** (never Zawgyi).
3. Change `"reviewStatus": "draft"` to `"reviewed"`.
4. Run `npm run validate` and `npm run check-vocab`, then commit.

## Data sources and licenses

- **Words and pinyin:** 新版HSK考试大纲 (2025 edition), the official HSK 3.0 syllabus.
- **Traditional characters and English meanings:** [CC-CEDICT](https://cc-cedict.org/wiki/), licensed [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/). The word-list PDFs were compiled by [Second Language](https://second-language.app/tools/hsk-vocabulary).
- **Myanmar explanations and examples:** written for this project. Because they are combined with CC-CEDICT data, the data in `data/` is shared under CC BY-SA 4.0.
- **Code:** [MIT](LICENSE).
