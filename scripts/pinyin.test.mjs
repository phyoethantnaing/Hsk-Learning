import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toNumbered, tones, syllables, normalizeForSearch } from '../src/lib/pinyin.mjs';

test('toNumbered', () => {
  assert.equal(toNumbered('ài'), 'ai4');
  assert.equal(toNumbered('bàba'), 'ba4 ba5');
  assert.equal(toNumbered('dǎ diànhuà'), 'da3 dian4 hua4');
  assert.equal(toNumbered('xīngqīrì'), 'xing1 qi1 ri4');
  assert.equal(toNumbered('nǚ\'ér'), 'nv3 er2');
  assert.equal(toNumbered('mòmò-wúwén'), 'mo4 mo4 wu2 wen2');
  assert.equal(toNumbered('zhèr'), 'zher4');
  assert.equal(toNumbered('shéi/shuí'), 'shei2/shui2');
  assert.equal(toNumbered('ǹg'), 'ng4');
});

test('tones', () => {
  assert.deepEqual(tones('ài'), [4]);
  assert.deepEqual(tones('māma'), [1, 5]);
  assert.deepEqual(tones('shéi/shuí'), [2]);
});

test('erhua is marked', () => {
  assert.deepEqual(syllables('yìdiǎnr').map((s) => s.erhua), [false, true]);
});

test('invalid pinyin throws', () => {
  assert.throws(() => syllables('g'));
  assert.throws(() => syllables('hello'));
  assert.throws(() => syllables('xyz'));
});

test('normalizeForSearch', () => {
  assert.equal(normalizeForSearch('Nǚ ér'), 'nver');
  assert.equal(normalizeForSearch('nü3'), 'nv');
  assert.equal(normalizeForSearch('nu:3'), 'nv');
  assert.equal(normalizeForSearch('ai4'), 'ai');
});
