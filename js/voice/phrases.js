// Phrases the game says a lot. They are prepared in the background as soon as
// the natural voice is ready, so instructions and praise play without a pause.
import { state, focusEntries } from '../state.js';
import { PRAISE, PRAISE_SECOND, PRAISE_EFFORT, NEARLY } from '../screens/play.js';

export function commonPhrases() {
  const name = state.settings.childName;
  const withName = (t) => (name ? t.replace(/!$/, `, ${name}!`) : t);
  const per = state.settings.wordsPerMission;
  const praise = [...PRAISE, ...PRAISE_SECOND, ...PRAISE_EFFORT];
  return [
    // home + mission start (most urgent first)
    name ? `Hi ${name}!` : 'Hi there!',
    'Ready for some magic spelling?',
    'Tap the rainbow to start a mission.',
    name ? `Let's go, ${name}!` : "Let's go!",
    `Spell ${per} words to fill the rainbow.`,
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
    ...praise.map(withName),
    ...NEARLY,
    // end of mission, presents, unicorns
    'Hooray! Mission complete!',
    'And you have a surprise! Tap the present.',
    'A surprise for you! Tap the present to open it.',
    'You have a surprise waiting! Tap the present.',
    'Tap a unicorn to make it your buddy.',
    'Keep spelling to find this unicorn!',
    'Do you want to stop playing?',
    // practice test
    'This is a practice spelling test, just like at school.',
    'Listen to each word, spell it, and press next. Press start when you are ready.',
    ...Array.from({ length: 12 }, (_, i) => `Number ${i + 1}.`),
  ];
}

// This week's words and sentences: the ones most worth having ready.
export function focusPhrases() {
  return focusEntries().flatMap((e) => [e.text, e.sentence]).filter(Boolean);
}

export function entryPhrases(entries) {
  return entries.flatMap((e) => [e.text, e.sentence]).filter(Boolean);
}
