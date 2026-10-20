// The four tones and the neutral tone, as shown on tone chips (word pages,
// flashcards, the Start page). `how` is the full description; pronunciation
// tips in the word data must not repeat it (scripts/validate-data.mjs).
export const TONES = {
  1: { name: 'အသံ ၁', short: 'အမြင့် တည့်တည့်', how: 'အသံ အမြင့်မှာ တည့်တည့် ဆွဲထားပါ', mark: 'ā' },
  2: { name: 'အသံ ၂', short: 'အောက်ကနေ အပေါ်တက်', how: 'မေးခွန်းမေးသလို အောက်ကနေ အပေါ်တက်ပါ', mark: 'á' },
  3: { name: 'အသံ ၃', short: 'နှိမ့်ပြီး ပြန်တက်', how: 'အောက်ကို နှိမ့်ပြီးမှ ပြန်တက်ပါ', mark: 'ǎ' },
  4: { name: 'အသံ ၄', short: 'အပေါ်ကနေ အောက်ချ', how: 'ဆူသလို အပေါ်ကနေ အောက်ကို မြန်မြန်ချပါ', mark: 'à' },
  5: { name: 'အသံပေါ့', short: 'ပေါ့ပေါ့ တိုတို', how: 'ပေါ့ပေါ့လေး တိုတိုလေး ပြောပါ', mark: 'a' },
};

/** Shown once per page wherever Myanmar-letter sound hints appear. */
export const HINT_DISCLAIMER = 'မြန်မာစာလုံးက အကြမ်းဖျင်း အသံပဲနော်။ 🔊 ခလုတ်ကို နှိပ်ပြီး နားထောင်ပါ။';
