// Part-of-speech labels in Myanmar, each with a plain explanation for children
// (no grammar jargon without saying what it means).
export const POS = {
  noun: ['နာမ်', 'လူ၊ ပစ္စည်း၊ နေရာ စတာတွေရဲ့ နာမည်'],
  verb: ['ကြိယာ', 'လုပ်ရပ်ကို ပြောတဲ့ စကားလုံး'],
  adjective: ['နာမဝိသေသန', 'ဘယ်လိုပုံစံလဲ ပြောတဲ့ စကားလုံး (ကြီး၊ လှ၊ ပူ…)'],
  adverb: ['ကြိယာဝိသေသန', 'လုပ်ရပ် ဒါမှမဟုတ် ပုံစံကို ထပ်ဖြည့်ပြောတဲ့ စကားလုံး (အရမ်း၊ လည်း…)'],
  pronoun: ['နာမ်စား', 'နာမည်အစား သုံးတဲ့ စကားလုံး (ငါ၊ မင်း၊ သူ…)'],
  numeral: ['ဂဏန်း', 'အရေအတွက်ကို ပြောတဲ့ စကားလုံး'],
  'numeral-measure': ['ဂဏန်း + ရေတွက်ပုဒ်', 'ဂဏန်းနဲ့ ရေတွက်ပုဒ် ပေါင်းထားတဲ့ စကားလုံး (一下၊ 一些…)'],
  'measure word': ['ရေတွက်ပုဒ်', 'ဂဏန်းနဲ့ နာမ်ကြားမှာ ထည့်တဲ့ စကားလုံး (ခု၊ ယောက်၊ အုပ်…)'],
  preposition: ['ဝိဘတ်', 'နေရာ၊ ဦးတည်ရာကို ပြတဲ့ စကားလုံး (…မှာ၊ …ကို)'],
  conjunction: ['သမ္ဗန္ဓ', 'စကားလုံးတွေကို ဆက်ပေးတဲ့ စကားလုံး (…နဲ့)'],
  particle: ['ပစ္စည်း', 'စာကြောင်းမှာ ထည့်ပြောတဲ့ အသံလေး (…လား၊ …ပြီ၊ …ရဲ့)'],
  interjection: ['အာမေဍိတ်', 'အော်ပြော နှုတ်ဆက်တဲ့ စကားလုံး'],
  'auxiliary verb': ['ကြိယာထောက်', 'လုပ်ရပ်ရဲ့ ရှေ့မှာ ထည့်တဲ့ စကားလုံး (…တတ်တယ်၊ …နိုင်တယ်)'],
  onomatopoeia: ['အသံစွဲ', 'အသံကို တုပတဲ့ စကားလုံး'],
  prefix: ['ရှေ့ဆက်', 'တခြားစကားလုံးရဲ့ ရှေ့မှာ ဆက်တဲ့ စာလုံး'],
  suffix: ['နောက်ဆက်', 'တခြားစကားလုံးရဲ့ နောက်မှာ ဆက်တဲ့ စာလုံး'],
  phrase: ['စကားစု', 'စကားလုံး နှစ်လုံး သုံးလုံး ပေါင်းထားတဲ့ အသုံး'],
  idiom: ['ဆိုရိုးစကား', 'အဓိပ္ပာယ် အထူးရှိတဲ့ စကားစု'],
  'proper noun': ['နာမ်အမည်', 'နိုင်ငံ၊ မြို့၊ လူ စတာတွေရဲ့ နာမည်'],
};

export function posList(pos) {
  return [pos ?? []].flat().map((p) => ({ key: p, name: POS[p]?.[0] ?? p, help: POS[p]?.[1] ?? '' }));
}

// Abbreviations used by the official syllabus (新版HSK考试大纲) for parts of speech.
export const OFFICIAL_POS = {
  名: 'noun',
  动: 'verb',
  形: 'adjective',
  副: 'adverb',
  代: 'pronoun',
  数: 'numeral',
  量: 'measure word',
  数量: 'numeral-measure',
  介: 'preposition',
  连: 'conjunction',
  助: 'particle',
  叹: 'interjection',
  拟声: 'onomatopoeia',
  前缀: 'prefix',
  后缀: 'suffix',
};

/**
 * Parse the syllabus' part-of-speech string. Parts in （…） are secondary uses.
 *   parseOfficialPos('动、（名、量）') -> { main: ['verb'], minor: ['noun', 'measure word'] }
 * Returns null for an empty string; throws on an unknown abbreviation.
 */
export function parseOfficialPos(text) {
  if (!text) return null;
  const main = [];
  const minor = [];
  let inParens = false;
  for (let part of text.split('、')) {
    part = part.trim();
    if (part.startsWith('（')) inParens = true;
    const bare = part.replace(/[（）]/g, '');
    const key = OFFICIAL_POS[bare];
    if (!key) throw new Error(`Unknown part of speech "${bare}" in "${text}"`);
    const list = inParens ? minor : main;
    if (!list.includes(key)) list.push(key);
    if (part.endsWith('）')) inParens = false;
  }
  return { main, minor };
}
