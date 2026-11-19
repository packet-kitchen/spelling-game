// Practice Test: this week's school list, just like the Friday test.
// No help during the test; results and corrections at the end.
import { h, wait, sparkleBurst } from '../ui.js';
import { state, save, focusList, focusEntries, pendingGifts } from '../state.js';
import { applyOutcome } from '../scheduler.js';
import { compareSpelling, shuffle } from '../wordutils.js';
import { sfx } from '../sfx.js';
import { go } from '../router.js';
import { createPlay, roundTest, btn, wordEl } from './play.js';
import { createBuddy } from '../buddy.js';
import { prefetch } from '../voice/neural.js';
import { entryPhrases } from '../voice/phrases.js';

export function testScreen(root) {
  const list = focusList();
  const entries = focusEntries();
  if (!list || !entries.length) return noList(root);

  prefetch([...entries.map((e, i) => `Number ${i + 1}.`), ...entryPhrases(entries)], 'soon');
  const buddy = createBuddy({ cls: 'big' });
  const start = btn('📝 Start the test', 'primary big', () => begin());
  root.append(h('div', { class: 'screen end-screen' },
    h('div', { class: 'end-layout' }, buddy.el,
      h('div', { class: 'panel end-panel' },
        h('h1', {}, 'Practice Test'),
        h('p', { class: 'list-name' }, list.name),
        h('p', {}, `${entries.length} words. Listen to each word and spell it, just like at school.`),
        h('div', { class: 'end-buttons' }, start, btn('🏠 Home', 'big', () => go('home')))))));
  buddy.talk('Ready for your practice test?', [
    'This is a practice spelling test, just like at school.',
    `There are ${entries.length} words.`,
    'Listen to each word, spell it, and press next. Press start when you are ready.']);

  let ctx = null;
  const onKey = (ev) => {
    if (ev.key === 'Enter' && !ctx) { ev.preventDefault(); begin(); }
  };
  document.addEventListener('keydown', onKey);

  function begin() {
    if (ctx) return;
    document.removeEventListener('keydown', onKey);
    sfx.pop();
    root.innerHTML = '';
    ctx = createPlay(root, { kind: 'test', label: '📝 Test' });
    run(ctx, shuffle(entries), list, root);
  }

  return () => {
    document.removeEventListener('keydown', onKey);
    if (ctx) ctx.destroy();
  };
}

async function run(ctx, entries, list, root) {
  const answers = [];
  for (let i = 0; i < entries.length; i++) {
    ctx.setProgress(i / entries.length);
    if (window.__TEST__) Object.assign(window.__TEST__, { word: entries[i].text, activity: 'test' });
    const typed = await roundTest(ctx, entries[i], i + 1, entries.length);
    if (!ctx.alive() || typed === null) return;
    answers.push(typed);
    await wait(150);
  }
  ctx.setProgress(1);

  const now = Date.now();
  let right = 0;
  const results = entries.map((e, i) => {
    const ok = compareSpelling(e.text, answers[i]).correct;
    if (ok) right++;
    state.progress[e.key] = applyOutcome(state.progress[e.key], 'test', ok ? 'right' : 'wrong', now, { focus: true, attempt: ok ? '' : answers[i] });
    return { word: e.text, attempt: answers[i], right: ok };
  });
  const stars = right + (right === entries.length ? 5 : 0);
  state.stars += stars;
  state.tests.push({ date: now, listName: list.name, listId: list.id, results });
  if (state.tests.length > 100) state.tests.splice(0, state.tests.length - 100);
  state.sessions.push({ date: now, kind: 'test', words: entries.length, firstTry: right, stars });
  save();
  ctx.destroy();
  results_(root, { entries, results, right, stars });
}

function results_(root, { entries, results, right, stars }) {
  root.innerHTML = '';
  const total = results.length;
  const buddy = createBuddy({ cls: 'big' });
  buddy.setMood('happy');
  const wrong = entries.filter((_, i) => !results[i].right);
  const gifts = pendingGifts();

  const rows = results.map((r) => h('li', { class: 'result ' + (r.right ? 'ok' : 'bad') },
    h('span', { class: 'mark' }, r.right ? '✅' : '🔸'),
    r.right
      ? h('span', { class: 'res-word' }, r.word)
      : h('span', { class: 'res-pair' },
        h('s', { class: 'res-attempt' }, r.attempt),
        h('span', { class: 'arrow' }, '➜'),
        wordEl(r.word, new Set(), { marks: compareSpelling(r.word, r.attempt).targetMarks, cls: 'res-word inline' }))));

  const panel = h('div', { class: 'panel end-panel test-results' },
    h('h1', {}, `${right} out of ${total}!`),
    h('p', { class: 'end-stats' }, h('span', {}, `⭐ +${stars} stars`)),
    h('ul', { class: 'results' }, rows),
    h('div', { class: 'end-buttons' },
      gifts > 0 ? btn('🎁 Open your surprise!', 'primary big gift-btn', () => go('gift')) : null,
      wrong.length ? btn('🌈 Practise the tricky ones', gifts > 0 ? 'big' : 'primary big', () => go('mission', { entries: wrong, retry: true })) : null,
      btn('🏠 Home', 'big', () => go('home'))));
  root.append(h('div', { class: 'screen end-screen' }, h('div', { class: 'end-layout' }, buddy.el, panel)));

  let msg;
  if (right === total) {
    msg = [`Wow! You got all ${total} right!`, 'You get 5 bonus stars!'];
    sfx.fanfare();
    setTimeout(() => sparkleBurst(panel, 34), 200);
  } else if (right >= total * 0.7) {
    msg = ['Brilliant!', `You got ${right} out of ${total}.`, "Let's practise the tricky ones."];
    sfx.good();
    setTimeout(() => sparkleBurst(panel, 18), 200);
  } else {
    msg = ['Good effort!', `You got ${right} out of ${total}.`, 'Practising will help you remember the tricky ones.'];
    sfx.good();
  }
  buddy.talk(`${right} out of ${total}! ${right === total ? 'Perfect!' : 'Well done!'}`, msg);
}

function noList(root) {
  const buddy = createBuddy({ cls: 'big' });
  root.append(h('div', { class: 'screen end-screen' },
    h('div', { class: 'end-layout' }, buddy.el,
      h('div', { class: 'panel end-panel' },
        h('h1', {}, 'No test yet'),
        h('p', {}, "Ask a grown-up to add this week's spelling list."),
        h('div', { class: 'end-buttons' }, btn('🏠 Home', 'primary big', () => go('home')))))));
  buddy.talk("Ask a grown-up to add this week's spelling list.");
}

