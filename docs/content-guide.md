# Content guide: writing Myanmar word content

Rules for every batch in `data/words/`. `npm run validate` enforces the
ones marked ✔; the rest are checked by the reviewer.

## Who we write for

A 10-year-old Myanmar child who has never studied Chinese and has no teacher.

- Everyday spoken Myanmar, like a kind older sibling (…တယ်၊ …ပါ၊ …နော်), never
  literary style (သည်၊ ၏၊ ၍).
- Short sentences, one idea each.
- No grammar jargon unless explained at once: "လုပ်ရပ်ကိုပြောတဲ့ စကားလုံး (ကြိယာ)".
- Examples from a Myanmar child's life: school, family, ထမင်း, မုန့်ဟင်းခါး, သင်္ကြန်, football, phones, pets.
- Encouraging. Never make the learner feel stupid.
- Myanmar **Unicode** only, never Zawgyi. ✔

## Fields

| Field | What to write |
|---|---|
| `meaning` | 1–4 short meanings separated by ၊ |
| `kidExplanation` | 2–4 short sentences: what it means, when people use it |
| `pronunciationTip` | Myanmar-letter sound hint + only what is special (see below) |
| `memoryTip` | Fun way to remember the character. Only character-component facts you are sure of; otherwise say clearly it is a picture story |
| `usageNote` | Word order, what it goes with. May be `""` for very simple words |
| `commonMistake` | A mistake Myanmar learners really make. May be `""` |
| `examples` | ≥ 2 sentences ✔, only words of the same HSK level or lower ✔ (`npm run check-vocab`) |

Fields copied from the official list (`simplified`, `pinyin`, `english`…) and
generated ones (`pinyinNumbered`, `tones`) are filled by `npm run sync-words`.

## pronunciationTip

The word page already shows, for every syllable, a **tone chip** (colour, tone
name, how to say it) built from `tones`, and **once per page** the reminder that
Myanmar letters are only a hint and to listen with 🔊. So the tip must not
repeat either. ✔

Write:

1. The Myanmar-letter hint in quotes, syllables separated by spaces (or `-`
   before a neutral-tone syllable): `"ပေါ်-ဇ" လို့ ပြောပါ။` ✔ (a quoted hint is required)
2. Then only what is special for this word, for example:
   - tone change (不 bù → bú before tone 4; 一 yī → yí / yì)
   - sounds Myanmar does not have: zh ch sh r (curled tongue), z c s, j q x, f, ü, e, er, the i in zhi/chi/shi/ri/zi/ci/si
   - b d g are unaspirated (closer to ပ တ က than ဘ ဒ ဂ); p t k are aspirated (ဖ ထ ခ)

Do not write the tone descriptions ("ဆူသလို အပေါ်ကနေ အောက်ကို…") or the
"(မြန်မာစာလုံးက အကြမ်းဖျင်း အသံပဲနော်…)" disclaimer. ✔

### Myanmar spelling for pinyin sounds

Use these spellings consistently so the same sound always looks the same.

| Pinyin | Myanmar hint | Examples |
|---|---|---|
| b / p | ပ / ဖ | bā "ပါ", pí "ဖီ" |
| d / t | တ / ထ | dà "တာ", tā "ထာ" |
| g / k | က / ခ | gē "ကဲ", kàn "ခန်" |
| z / c / s | ဇ / ဆ / စ | zi "ဇ", cài "ဆိုင်" |
| zh / ch / sh / r | ကျ / ချ / ရှ / ရ (+ "curl the tongue" note) | chī "ချီ", shì "ရှီ" |
| j / q / x | ကျ / ချ / ရှ | jiā "ကျာ", qī "ချီ", xué "ရှွဲ" |
| f | ဖ (+ "teeth on lower lip" note) | fàn "ဖန်" |
| **ao** | **ော်** — never ောင် (that adds a nasal ending) | bāo "ပေါ်", dào "တော်", yào "ယော်", chāo "ချော်", nǎo "နော်", shǎo "ရှော်" ✔ |
| ai | ိုင် | ài "အိုင်", cài "ဆိုင်" |
| ei / ui | ေ / ွေ | bēi "ပေ", duì "တွေ" |
| ou | ို | dōu "တို" |
| an / ang | န် | bàn "ပန်", chàng "ချန်" |
| ong | ုန် | dōng "တုန်", gōng "ကုန်" |
| e | ဲ (+ "between အ and အော" note) | gē "ကဲ", hē "ဟဲ", chē "ချဲ" |
| en / eng | န် (+ "open the mouth less than an" note) | fēn "ဖန်", hěn "ဟန်" |
| in / ing | င် | jīn "ကျင်", tīng "ထင်", bìng "ပင်" |
| ie | ဲ | jiě "ကျဲ" |
| iao | ော် (ကျော် ချော် ရှော်…) | jiǎo "ကျော်", jiào "ကျော်" |
| iu | ို | jiǔ "ကျို" |
| ü / üe | ွီ / ွဲ (+ "round the lips" note) | yǔ "ယွီ", xué "ရှွဲ", jué "ကျွဲ" |
| uo | ွော | duō "တွော" |
| **ian** after b p m | ျန် (normal Myanmar stacks) | biān "ပျန်" |
| **ian** after d t n l | **ိယန်** — never တျ ထျ ဒျ နျ ✔ | diàn "တိယန်", tiān "ထိယန်", nián "နိယန်" |
| ian after j q x | ကျန် / ချန် / ရှန် | jiàn "ကျန်", qián "ချန်" |
| er | အာရ် (+ curl note) | èr "အာရ်" |

Avoid hints that spell a rude or silly Myanmar word: píng is written "ဖျင်", not "ဖင်".

`ိယန်` is read as one quick beat: say "တိ" and slide straight into "ယန်".

## Examples

- About **half of the first-person examples use ကျွန်မ** and half ကျွန်တော်, so
  girls and boys both see themselves (validate warns when a file is lopsided).
  Watch kinship words: a boy's 弟弟 is ညီလေး, a girl's is မောင်လေး; a boy's 妹妹
  is နှမလေး, a girl's is ညီမလေး.
- Pinyin with tone marks, one syllable per character ✔. Write spoken tone
  changes (不 bú shì, 一 yì běn) and neutral tones as people say them.
- Allowlisted proper nouns (缅甸, 仰光, 曼德勒) only, at most one per sentence ✔.
