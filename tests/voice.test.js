import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fixedPhrases, recordedWordPhrases, missedPhrase, withName, cleanText } from '../js/voice/phrases.js';
import { ELEVEN } from '../js/voice/eleven-config.js';

const dir = new URL(`../audio/${ELEVEN.dir}/`, import.meta.url);
const manifest = JSON.parse(readFileSync(new URL('manifest.json', dir), 'utf8'));

test('every fixed phrase and pre-recorded word for Amy is recorded', () => {
  const missing = [...fixedPhrases('Amy'), ...recordedWordPhrases()].filter((t) => !manifest.clips[t]);
  assert.deepEqual(missing, [], 'run: node tools/record-voice.mjs');
});

test('every recording in the manifest exists', () => {
  for (const file of Object.values(manifest.clips)) {
    assert.ok(existsSync(new URL(file, dir)), file);
  }
});

test('manifest matches the voice settings', () => {
  assert.equal(manifest.voiceId, ELEVEN.voiceId);
  assert.equal(manifest.model, ELEVEN.modelId);
  assert.equal(manifest.format, ELEVEN.outputFormat);
});

test('phrase helpers', () => {
  assert.equal(withName('Brilliant!', 'Amy'), 'Brilliant, Amy!');
  assert.equal(withName('Good work! Keep practising.', 'Amy'), 'Good work! Keep practising.');
  assert.equal(missedPhrase(1), 'Just one letter to fix.');
  assert.equal(missedPhrase(5), 'Some letters need fixing.');
  assert.equal(cleanText('  Hi   Amy! '), 'Hi Amy!');
  const fixed = fixedPhrases('Amy');
  assert.equal(new Set(fixed).size, fixed.length);
  assert.ok(fixed.every((t) => !/\d{2,}/.test(t) || /^Number \d+\.$/.test(t)), 'no changing numbers in fixed phrases');
});
