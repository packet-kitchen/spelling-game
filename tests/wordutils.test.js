import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseMarked, toMarked, autoTricky, trickyFor, compareSpelling, blankSentence,
  sentenceHasWord, parseWordInput, isValidWord, cleanWord, decoyLetters, scrambleTiles,
} from '../js/wordutils.js';
import { BUILT_IN_LISTS } from '../js/words.js';

test('parseMarked / toMarked round trip', () => {
  assert.deepEqual(parseMarked('bec[au]se'), { text: 'because', tricky: [3, 4] });
  assert.deepEqual(parseMarked('C[h]ris[t]mas'), { text: 'Christmas', tricky: [1, 5] });
  assert.equal(toMarked('because', [3, 4]), 'bec[au]se');
  assert.equal(toMarked('Christmas', [1, 5]), 'C[h]ris[t]mas');
});

test('autoTricky finds common patterns', () => {
  const t = (w) => autoTricky(w).map((i) => w[i]).join('');
  assert.equal(t('station'), 'tion');
  assert.equal(t('bridge'), 'dge');
  assert.equal(t('knight'), 'igh');
  assert.equal(t('make'), 'ae'); // split digraph a-e
  assert.equal(t('table'), 'le');
  assert.equal(t("can't"), "'");
  assert.equal(t('cat'), 'a');
});

test('trickyFor never blanks most of a short word', () => {
  const idx = trickyFor({ text: 'eye', tricky: [0, 1, 2] });
  assert.ok(idx.length <= 2);
});

test('compareSpelling marks letters', () => {
  const r = compareSpelling('because', 'becos');
  assert.equal(r.correct, false);
  assert.equal(r.matches, 4); // b e c s
  assert.deepEqual(r.targetMarks, ['ok', 'ok', 'ok', 'miss', 'miss', 'ok', 'miss']);
  assert.equal(compareSpelling('Christmas', 'christmas').correct, true);
  assert.equal(compareSpelling("can't", 'can’t'.replace('’', "'")).correct, true);
  const extra = compareSpelling('cat', 'caat');
  assert.deepEqual(extra.attemptMarks.filter((m) => m === 'bad').length, 1);
});

test('blankSentence hides the word but not longer words containing it', () => {
  assert.equal(blankSentence('I wore my coat because it was cold.', 'because'), 'I wore my coat  _____  it was cold.');
  assert.equal(blankSentence('The sea is blue.', 'the'), ' _____  sea is blue.');
  assert.equal(blankSentence('I saw a hedgehog.', 'hedge'), 'I saw a hedgehog.');
  assert.ok(sentenceHasWord("I can't find my shoes.", "can't"));
  assert.ok(sentenceHasWord('I can’t find my shoes.', "can't"));
});

test('parseWordInput handles commas, lines, numbering and junk', () => {
  const { good, bad } = parseWordInput('1. because, people\n2) water;water\nbad word!, ice-cream, don’t');
  assert.deepEqual(good, ['because', 'people', 'water', 'ice-cream', "don't"]);
  assert.deepEqual(bad, ['bad word!']);
});

test('isValidWord', () => {
  assert.ok(isValidWord('beautiful'));
  assert.ok(isValidWord("I'll"));
  assert.ok(isValidWord('Mr'));
  assert.ok(!isValidWord('hello1'));
  assert.ok(!isValidWord(''));
  assert.equal(cleanWord('  don’t  '), "don't");
});

test('tiles contain all letters plus decoys, not in order', () => {
  const word = 'because';
  const decoys = decoyLetters(word, 2);
  assert.equal(decoys.length, 2);
  const tiles = scrambleTiles([...word, ...decoys]);
  assert.equal(tiles.length, word.length + 2);
  for (const c of word) assert.ok(tiles.includes(c));
});

test('built-in word lists are well formed', () => {
  const ids = new Set();
  for (const list of BUILT_IN_LISTS) {
    assert.ok(!ids.has(list.id), `duplicate list id ${list.id}`);
    ids.add(list.id);
    assert.ok(list.words.length >= 5, list.id);
    const seen = new Set();
    for (const raw of list.words) {
      const [marked, sentence] = raw.split('|');
      const { text, tricky } = parseMarked(marked);
      assert.ok(isValidWord(text), `${list.id}: bad word ${text}`);
      assert.ok(tricky.length > 0, `${list.id}: ${text} has no tricky part`);
      assert.ok(tricky.length < text.length || text.length <= 3, `${list.id}: ${text} tricky part is whole word`);
      assert.ok(sentence && /[.!?"]$/.test(sentence), `${list.id}: ${text} needs a sentence`);
      assert.ok(sentenceHasWord(sentence, text), `${list.id}: sentence for "${text}" should contain it: ${sentence}`);
      assert.ok(!seen.has(text.toLowerCase()), `${list.id}: duplicate ${text}`);
      seen.add(text.toLowerCase());
    }
  }
});
