import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SOUNDS, soundsFor } from '../src/lib/sounds.mjs';

const ids = (pinyin) => soundsFor(pinyin).map((s) => s.id);

test('soundsFor finds the hard sounds in order', () => {
  assert.deepEqual(soundsFor('zhè'), [{ id: 'zhchshr', label: 'zh' }, { id: 'e', label: 'e' }]);
  assert.deepEqual(ids('dǎ diànhuà'), ['bdg', 'glide', 'h']);
  assert.deepEqual(ids('qùnián'), ['jqx', 'v', 'glide']);
  assert.deepEqual(ids('shēngrì'), ['zhchshr', 'en', 'buzz']);
});

test('ü is found after y/j/q/x as well as written ü', () => {
  assert.ok(ids('yǔ').includes('v'));
  assert.ok(ids('lǜsè').includes('v'));
  assert.ok(!ids('wǔ').includes('v'));
});

test('erhua and er', () => {
  assert.deepEqual(soundsFor('nánháir').at(-1), { id: 'er', label: '儿' });
  assert.deepEqual(soundsFor('èr'), [{ id: 'er', label: 'er' }]);
});

test('ye is not the e sound and plain syllables need no link', () => {
  assert.deepEqual(ids('yéye'), []);
  assert.deepEqual(ids('māma'), []);
});

test('every id soundsFor can return is explained', () => {
  const known = new Set(SOUNDS.map((s) => s.id));
  for (const p of ['bā pà dà tā gē kàn zì cài sì zhōng chī shì rè jiā qī xiǎo fēi hǎo yǔ hē hěn èr nǎr diǎn']) {
    for (const s of soundsFor(p)) assert.ok(known.has(s.id), s.id);
  }
});
