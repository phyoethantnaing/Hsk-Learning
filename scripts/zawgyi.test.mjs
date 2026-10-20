import { test } from 'node:test';
import assert from 'node:assert/strict';
import { looksLikeZawgyi } from './lib/zawgyi.mjs';

const UNICODE = [
  'ချစ်တယ်၊ အရမ်းကြိုက်တယ်',
  'ကျွန်တော် မေမေ့ကို ချစ်တယ်။',
  'ကျောင်း',
  'မြန်မာ',
  'သင်္ကြန်',
  'မုန့်ဟင်းခါး',
  'ဆူသလို အပေါ်ကနေ အောက်ကို မြန်မြန်ချပါ',
  'ရှေးဟောင်းစာလုံး 愛 ရဲ့ အလယ်မှာ 心 (နှလုံးသား) ပါတယ်။',
  'စစ်ဆေးဆဲ',
  'English only, 中文 only',
];

// The same words typed with a Zawgyi keyboard.
const ZAWGYI = [
  'ေက်ာင္း', // ကျောင်း
  'ျမန္မာ', // မြန်မာ
  'ခ်စ္တယ္', // ချစ်တယ်
  'ေမေမ', // မေမေ
  'သၾကၤန္', // သင်္ကြန်
];

test('Myanmar Unicode text is accepted', () => {
  for (const s of UNICODE) assert.equal(looksLikeZawgyi(s), false, s);
});

test('Zawgyi text is rejected', () => {
  for (const s of ZAWGYI) assert.equal(looksLikeZawgyi(s), true, s);
});
