// Pinyin sounds that are hard for Myanmar speakers. Each rule is explained once
// on the start page (#sound-<id>); word pages link to the ones a word uses, so
// pronunciationTip only has to say what is special about that word.

import { syllables } from './pinyin.mjs';

export const SOUNDS = [
  {
    id: 'bdg',
    title: 'b d g',
    body: 'b d g ကို မြန်မာ "ဘ ဒ ဂ" လို မပြောပါနဲ့ — "ပ တ က" နဲ့ ပိုနီးပါတယ်။ ပါးစပ်ရှေ့မှာ လက်ဝါး ထားပြီး ပြောကြည့်ပါ၊ လေ မထိရပါဘူး။',
    examples: [['爸爸', 'bàba'], ['大', 'dà'], ['哥哥', 'gēge']],
  },
  {
    id: 'ptk',
    title: 'p t k',
    body: 'p t k က "ဖ ထ ခ" လို လေ အများကြီး ထွက်ပါတယ် — လက်ဝါးကို လေ ထိရမယ်။ b/p၊ d/t၊ g/k တွဲတွေရဲ့ ကွာခြားချက်က လေ ထွက်တာ မထွက်တာပဲ ဖြစ်ပါတယ်။',
    examples: [['怕', 'pà'], ['他', 'tā'], ['看', 'kàn']],
  },
  {
    id: 'zcs',
    title: 'z c s',
    body: 'z က "ဇ" နဲ့ "စ" ကြားက ts အသံ (လေ မထွက်)၊ c က လေ ထွက်တဲ့ ts — "ဆ" လို၊ s က "စ"။ မြန်မာတွေ c ကို "စ" လို ပြောမိတတ်ပါတယ် — လေ ထွက်အောင် ပြောပါ။',
    examples: [['字', 'zì'], ['菜', 'cài'], ['四', 'sì']],
  },
  {
    id: 'zhchshr',
    title: 'zh ch sh r',
    body: 'လျှာဖျားကို အပေါ်ကို (အာခေါင်ဆီ) ကော့ပြီး ပြောပါ။ zh ≈ "ကျ" (လေ မထွက်)၊ ch ≈ "ချ" (လေ ထွက်)၊ sh ≈ "ရှ"၊ r က အင်္ဂလိပ် r နဲ့ "ရှ" ကြားလောက်။',
    examples: [['中', 'zhōng'], ['吃', 'chī'], ['是', 'shì'], ['热', 'rè']],
  },
  {
    id: 'jqx',
    title: 'j q x',
    body: 'j q x မှာ လျှာ မကော့ပါ — လျှာဖျားက အောက်သွားနောက်မှာ နေပြီး လျှာအလယ်က အာခေါင်ကို ထိပါတယ်။ j ≈ "ကျ"၊ q ≈ "ချ" (လေ ထွက်)၊ x ≈ "ရှ" (ပိုပါးပါး)။ zh ch sh နဲ့ ခွဲပြောပါ။',
    examples: [['家', 'jiā'], ['七', 'qī'], ['小', 'xiǎo']],
  },
  {
    id: 'f',
    title: 'f',
    body: 'အပေါ်သွားကို အောက်နှုတ်ခမ်းပေါ် တင်ပြီး လေ မှုတ်ထုတ်ပါ။ မြန်မာ "ဖ" (နှုတ်ခမ်း နှစ်ခုလုံး ထိတာ) နဲ့ မတူပါ။',
    examples: [['飞', 'fēi'], ['饭', 'fàn']],
  },
  {
    id: 'h',
    title: 'h',
    body: 'h က မြန်မာ "ဟ" ထက် လည်ချောင်းထဲကနေ နည်းနည်း ကြမ်းကြမ်း ထွက်ပါတယ် — ခပ်ပြင်းပြင်း သက်ပြင်းချသလိုပေါ့။',
    examples: [['好', 'hǎo'], ['喝', 'hē']],
  },
  {
    id: 'v',
    title: 'ü (yu ju qu xu)',
    body: 'ü ကို "ယူ" လို မပြောပါနဲ့။ "အီ" လို့ ပြောပြီး လျှာ မရွှေ့ဘဲ နှုတ်ခမ်းကိုပဲ လုံးလိုက်ပါ။ y j q x နောက်မှာ အစက်နှစ်စက် မရေးပေမဲ့ ü ပါပဲ: yu၊ ju၊ qu၊ xu။',
    examples: [['雨', 'yǔ'], ['女', 'nǚ'], ['去', 'qù']],
  },
  {
    id: 'e',
    title: 'e',
    body: 'e က မြန်မာ "အ" နဲ့ "အော" ကြားက အသံပါ — ပါးစပ် နည်းနည်း ဟပြီး လည်ချောင်းထဲက "အ" လို့ ပြောပါ။ အင်္ဂလိပ် e (အဲ) မဟုတ်ပါ။',
    examples: [['喝', 'hē'], ['车', 'chē']],
  },
  {
    id: 'en',
    title: 'en / eng',
    body: 'en နဲ့ eng ကို an / ang ထက် ပါးစပ် နည်းနည်းပဲ ဟပြီး ပြောပါ။ အသံညွှန်းမှာ "န်" လို့ ရေးထားပေမဲ့ အသံက "အန်" ထက် ပိုမှိန်ပါတယ်။',
    examples: [['很', 'hěn'], ['冷', 'lěng']],
  },
  {
    id: 'er',
    title: 'er / 儿',
    body: 'er (二 èr) ကို လျှာဖျားလေး နောက်ကို ကော့ပြီး ပြောပါ။ 哪儿 nǎr လို 儿 ပါတဲ့ စကားလုံးတွေမှာ 儿 ကို သီးသန့် မဖတ်ဘဲ ရှေ့က အသံရဲ့ နောက်မှာ လျှာကို ကော့လိုက်ရုံပါ။',
    examples: [['二', 'èr'], ['哪儿', 'nǎr']],
  },
  {
    id: 'buzz',
    title: 'zhi chi shi ri / zi ci si ရဲ့ i',
    body: 'ဒီ syllable တွေရဲ့ i ကို "အီ" လို အပြည့် မထွက်ပါနဲ့။ ရှေ့က ဗျည်းအသံကို ဆက်ဆွဲထားသလို တိုးတိုးလေး ဆက်ထွက်တဲ့ အသံပါ။',
    examples: [['是', 'shì'], ['字', 'zì']],
  },
  {
    id: 'glide',
    title: '"တိယန်" "နိယော်" လို အသံညွှန်း',
    body: '"တိယန်"၊ "နိယော်"၊ "တိယို" လို အသံညွှန်းတွေကို နှစ်လုံး ခွဲမဖတ်ပါနဲ့ — "တိ" ကို တိုတို ပြောပြီး "ယန်" ထဲကို ချက်ချင်း ချော်ဝင်ပါ။ တစ်ချက်တည်း ဖြစ်ရပါမယ်။',
    examples: [['点', 'diǎn'], ['鸟', 'niǎo']],
  },
];

const BUZZ = new Set(['zhi', 'chi', 'shi', 'ri', 'zi', 'ci', 'si']);

/** The sound rules a word's pinyin uses, in order: [{ id, label }], one per id. */
export function soundsFor(pinyin) {
  const found = new Map();
  const add = (id, label) => {
    if (!found.has(id)) found.set(id, label);
  };
  for (const s of syllables(pinyin)) {
    const bare = s.bare.replace(/r$/, s.erhua ? '' : 'r');
    const initial = bare.match(/^(zh|ch|sh|[bpmfdtnlgkhjqxrzcswy])?/)[0];
    const final = bare.slice(initial.length);
    if ('bdg'.includes(initial) && initial) add('bdg', initial);
    if ('ptk'.includes(initial) && initial) add('ptk', initial);
    if (['z', 'c', 's'].includes(initial)) add('zcs', initial);
    if (['zh', 'ch', 'sh', 'r'].includes(initial)) add('zhchshr', initial);
    if (['j', 'q', 'x'].includes(initial)) add('jqx', initial);
    if (initial === 'f') add('f', 'f');
    if (initial === 'h') add('h', 'h');
    if (final.includes('v') || (['y', 'j', 'q', 'x'].includes(initial) && final.startsWith('u'))) add('v', 'ü');
    if (BUZZ.has(bare)) add('buzz', `${bare} ရဲ့ i`);
    if (final === 'e' && initial !== 'y') add('e', 'e');
    if (final === 'en' || final === 'eng') add('en', final);
    if (bare === 'er' || s.erhua) add('er', s.erhua ? '儿' : 'er');
    if (['d', 't', 'n', 'l'].includes(initial) && /^i(an|ao|u)$/.test(final)) add('glide', `${initial}${final}`);
  }
  return [...found].map(([id, label]) => ({ id, label }));
}
