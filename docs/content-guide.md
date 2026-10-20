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
| `memoryTip` | Fun way to remember the character: a little story or picture, not just "A = x, B = y" (see below) |
| `usageNote` | Word order, what it goes with. May be `""` for very simple words |
| `commonMistake` | A mistake Myanmar learners really make (see below). `""` only when there is no real confusion |
| `examples` | ≥ 2 sentences ✔, only words of the same HSK level or lower ✔ (`npm run check-vocab`) |

Fields copied from the official list (`simplified`, `pinyin`, `english`…) and
generated ones (`pinyinNumbered`, `tones`) are filled by `npm run sync-words`.
So is `partOfSpeech`: it comes from the syllabus' own labels (动 名 形 量…;
uses in （…） go to `partOfSpeechMinor`). Write `partOfSpeech` by hand only for
the words where the syllabus gives none — `npm run validate` tells you if a
hand-written value disagrees with the syllabus.

## memoryTip

Keep it as rich as HSK 1: two or three sentences that give the child a scene
to picture. Use the character's real parts (radicals such as 氵 ရေ, 扌 လက်,
艹 အပင်, 饣 အစားအစာ) when you are sure of them, then build a short story on
top: "饱 = 饣 + 包 — ဗိုက်ထဲကို အစားအစာတွေနဲ့ ထုပ်ထားသလို ပြည့်နေပြီ!". If a
part is only a look-alike, say "…လို မြင်ရတယ်" or "ပုံဖော်ပါ" so it is clear
it is a picture story, not etymology.

## commonMistake

Fill it whenever there is a real confusion, for example:

- similar characters: 草/早, 查/茶, 变/遍, 饱/包
- similar sounds or tones: 冰 bīng / 病 bìng, 室 shì / 是 shì
- words that look alike in meaning: 矮/短 (ပု/တို), 帮助/帮忙, 不用/不要, 才/就
- word order or grammar that differs from Myanmar: 把 and 被 need a result
  after the verb, 搬家到… ✘ → 搬到… ✔, 比 never takes 很

Show the wrong form with ✘ and the right one with ✔. Leave it `""` only for
words with no confusion worth a sentence.

## pronunciationTip

The word page already shows:

- for every syllable, a **tone chip** (colour, tone name, how to say it) built
  from `tones`;
- **once per page**, the reminder that Myanmar letters are only a hint and to
  listen with 🔊;
- small links such as "d အသံ ဘယ်လို ထွက်လဲ?" to the start page, one for each
  hard sound in the word (b/d/g, p/t/k, z/c/s, zh/ch/sh/r, j/q/x, f, h, ü, e,
  en/eng, er/儿, the i in zhi…si, the ိယန် glide). Each rule is explained once
  there, in `src/lib/sounds.mjs`.

So the tip repeats none of these. ✔ Write:

1. The Myanmar-letter hint in quotes, syllables separated by spaces (or `-`
   before a neutral-tone syllable): `"ပေါ်-ဇ" လို့ ပြောပါ။` ✔ (a quoted hint is required)
2. At most **one** note about what is special in *this* word, for example a
   tone change (不 bù → bú before tone 4; 一 yī → yí / yì; 3 + 3 → 2 + 3), a
   word with several readings (得 dé / de / děi), or a light syllable that
   learners stress. Leave it out when nothing is special.

From HSK 3 on, `npm run validate` fails a tip with more than one note or with a
basic sound rule in it. ✔ (HSK 1–2 tips were written before this rule and still
include the basic notes.)

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
| zhi chi shi ri / zi ci si | ကျီ ချီ ရှီ ရီ / ဇ ဆ စ | zhǐ "ကျီ", rì "ရီ", zì "ဇ", cì "ဆ" |
| üan (yuan, quan, xuan, juan) | ွမ် (like ယွမ် for 元) | yuǎn "ယွမ်", quán "ချွမ်" |
| ün / iao after n l | ွင် / ိယော် | yùn "ယွင်", niǎo "နိယော်", tiáo "ထိယော်" |
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
