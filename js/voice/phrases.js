// Everything the game says out loud, apart from the spelling words and their
// sentences. Keeping it to a fixed list means every line can be recorded once
// (see tools/record-voice.mjs) and played back instantly.
//
// This module must stay free of browser-only code: the recording script
// imports it in Node.

import { UNICORNS } from '../unicorns.js';
import { BUILT_IN_LISTS } from '../words.js';
import { parseMarked } from '../wordutils.js';

export const PRAISE = ['Brilliant!', 'Super spelling!', 'Magical!', 'Fantastic!', 'Well done!', 'Amazing!',
  "You're a star!", 'Sparkly spelling!', 'Wonderful!', 'Super-duper!', 'Perfect!', 'Hooray!'];
export const PRAISE_SECOND = ['Well done! You got it!', 'Yes! You did it!', 'Great remembering!'];
export const PRAISE_EFFORT = ['Well done for trying hard!', 'Good work! Keep practising.', 'You are getting there!'];
export const NEARLY = ['So close!', 'Nearly!', 'Good try!', 'Nearly there!'];

export function withName(text, name) {
  return name ? text.replace(/!$/, `, ${name}!`) : text;
}

export function greeting(name) {
  return name ? `Hi ${name}!` : 'Hi there!';
}

export function letsGo(name) {
  return name ? `Let's go, ${name}!` : "Let's go!";
}

// Spoken after a near miss (the number of right letters is shown on screen).
export function missedPhrase(missed) {
  if (missed <= 1) return 'Just one letter to fix.';
  if (missed === 2) return 'Just two letters to fix.';
  return 'Some letters need fixing.';
}

export function cleanText(text) {
  return String(text || '').replace(/\s+/g, ' ').trim();
}

// Every fixed line, for the given child's name.
export function fixedPhrases(name = '') {
  const praise = [...PRAISE, ...PRAISE_SECOND, ...PRAISE_EFFORT];
  const lines = [
    // home and mission start
    greeting(''), greeting(name),
    'Ready for some magic spelling?',
    'Tap the rainbow to start a mission.',
    'You have a surprise waiting! Tap the present.',
    'Ask a grown-up to choose some spelling words for you.',
    letsGo(''), letsGo(name),
    'Spell the words to fill the rainbow.',
    "Let's practise the tricky words from your test.",
    // look, cover, write
    'A new word!',
    "Look carefully at the pink letters. When you have remembered it, press, I'm ready.",
    'Look at the pink letters.',
    'Look again.',
    'Now spell',
    // listen and spell
    'Listen, and spell the word.',
    'Press check when you have finished.',
    'Spell',
    'Type the word first, then press check.',
    // other activities
    'Fill in the missing letters.',
    'Fill in the missing letter.',
    'Have another go!',
    'Put the letters in the right order to spell,',
    'Watch out! There are some extra letters.',
    'Put the letters in order to spell,',
    "Let's write it together.",
    'Copy the letters one by one.',
    // praise and encouragement
    ...praise,
    ...praise.map((t) => withName(t, name)),
    ...NEARLY,
    missedPhrase(1), missedPhrase(2), missedPhrase(3),
    // end of a mission, presents and unicorns
    'Hooray! Mission complete!',
    'Look at all your stars!',
    'And you have a surprise! Tap the present.',
    'A surprise for you! Tap the present to open it.',
    'Wow!',
    'A new unicorn friend wants to play with you!',
    'Here are all your unicorn friends!',
    'Tap a unicorn to make it your buddy.',
    'Keep spelling to find this unicorn!',
    'Hello!',
    ...UNICORNS.flatMap((u) => [`Meet ${u.name}!`, `${u.name} is your buddy now!`]),
    'Do you want to stop playing?',
    // practice test
    "Ask a grown-up to add this week's spelling list.",
    'This is a practice spelling test, just like at school.',
    'Listen to each word, spell it, and press next. Press start when you are ready.',
    // enough for the longest built-in list (64 words)
    ...Array.from({ length: 64 }, (_, i) => `Number ${i + 1}.`),
    'Wow! You got them all right!',
    'You get 5 bonus stars!',
    "Let's practise the tricky ones.",
    'Good effort!',
    'Practising will help you remember the tricky ones.',
    // grown-ups' "Test the voice" button
    'Can you spell, beautiful?',
  ];
  return [...new Set(lines.map(cleanText).filter(Boolean))];
}

// Words and sentences of a list of entries ({ text, sentence }).
export function entryPhrases(entries) {
  return entries.flatMap((e) => [e.text, e.sentence]).map(cleanText).filter(Boolean);
}

// Word lists recorded in advance: all the built-in lists. (Words a grown-up
// adds that aren't in these lists are made when first needed, with a key.)
export const RECORDED_LISTS = BUILT_IN_LISTS.map((l) => l.id);

export function recordedWordPhrases() {
  const out = [];
  for (const list of BUILT_IN_LISTS.filter((l) => RECORDED_LISTS.includes(l.id))) {
    for (const raw of list.words) {
      const [marked, sentence = ''] = raw.split('|');
      out.push(parseMarked(marked).text, sentence);
    }
  }
  return [...new Set(out.map(cleanText).filter(Boolean))];
}
