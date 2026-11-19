// Magic Mission: a short practice session (about 10 minutes).
import { h, wait, sparkleBurst } from '../ui.js';
import { state, save, activeEntries, pendingGifts } from '../state.js';
import { pickMissionWords, activityFor, applyOutcome, shouldRepeat } from '../scheduler.js';
import { sfx } from '../sfx.js';
import { go } from '../router.js';
import { createPlay, ROUNDS, celebrate, btn } from './play.js';
import { createBuddy } from '../buddy.js';
import { prepare } from '../speech.js';
import { entryPhrases, letsGo } from '../voice/phrases.js';

export function missionScreen(root, params = {}) {
  const entries = params.entries && params.entries.length
    ? params.entries
    : pickMissionWords(activeEntries(), state.progress, Date.now(), state.settings.wordsPerMission);

  if (!entries.length) return noWords(root);

  const ctx = createPlay(root, { kind: 'mission' });
  prepare(entryPhrases(entries), 'soon');
  run(ctx, entries, root, params);
  return () => ctx.destroy();
}

async function run(ctx, entries, root, params) {
  const queue = entries.map((e) => ({ e, rounds: 0 }));
  const maxRounds = entries.length + 4;
  let played = 0;
  let finished = 0;
  const firstTry = new Set();
  let stars = 0;

  ctx.show([h('div', { class: 'mission-intro' }, '🌈')], []);
  const go = letsGo(state.settings.childName);
  await ctx.buddy.talk(
    `${go} Spell ${entries.length} words to fill the rainbow.`,
    params.retry
      ? ["Let's practise the tricky words from your test."]
      : [go, 'Spell the words to fill the rainbow.']);
  if (!ctx.alive()) return;

  while (queue.length && played < maxRounds) {
    const item = queue.shift();
    const e = item.e;
    const prev = state.progress[e.key];
    const activity = activityFor(prev ? prev.level : 0);
    if (window.__TEST__) Object.assign(window.__TEST__, { word: e.text, activity });
    const result = await ROUNDS[activity](ctx, e);
    if (!ctx.alive() || !result) return;

    const next = applyOutcome(prev, activity, result.outcome, Date.now(), { focus: e.focus, attempt: result.lastWrong });
    state.progress[e.key] = next;
    if (result.outcome === 'first') firstTry.add(e.key);
    save();

    played++;
    item.rounds++;
    const again = shouldRepeat(next.level, item.rounds) && played + queue.length < maxRounds;
    if (again) queue.splice(Math.min(2, queue.length), 0, item);
    else finished++;

    // finished words count fully, words that will come back count half
    ctx.setProgress((finished + queue.filter((q) => q.rounds > 0).length * 0.5) / entries.length);
    stars += await celebrate(ctx, e, result.outcome);
    save();
    if (!ctx.alive()) return;
  }

  ctx.setProgress(1);
  state.sessions.push({ date: Date.now(), kind: 'mission', words: entries.length, firstTry: firstTry.size, stars });
  if (state.sessions.length > 300) state.sessions.splice(0, state.sessions.length - 300);
  save();
  await wait(400);
  if (!ctx.alive()) return;
  ctx.destroy();
  missionEnd(root, { words: entries.length, stars, firstTry: firstTry.size });
}

function missionEnd(root, { words, stars, firstTry }) {
  root.innerHTML = '';
  const buddy = createBuddy({ cls: 'big' });
  buddy.setMood('happy');
  const gifts = pendingGifts();
  const panel = h('div', { class: 'panel end-panel' },
    h('div', { class: 'rainbow-arc', 'aria-hidden': 'true' }),
    h('h1', {}, 'Mission complete!'),
    h('p', { class: 'end-stats' },
      h('span', {}, `🦄 ${words} words`),
      h('span', {}, `⭐ +${stars} stars`),
      firstTry ? h('span', {}, `🎯 ${firstTry} right first time`) : null),
    h('div', { class: 'end-buttons' },
      gifts > 0 ? btn('🎁 Open your surprise!', 'primary big gift-btn', () => go('gift')) : null,
      btn('🌈 Play again', gifts > 0 ? 'big' : 'primary big', () => go('mission')),
      btn('🏠 Home', 'big', () => go('home'))));
  root.append(h('div', { class: 'screen end-screen' }, h('div', { class: 'end-layout' }, buddy.el, panel)));
  sfx.fanfare();
  setTimeout(() => sparkleBurst(panel, 30), 200);
  const msg = ['Hooray! Mission complete!', 'Look at all your stars!'];
  if (gifts > 0) msg.push('And you have a surprise! Tap the present.');
  buddy.talk(gifts > 0 ? 'Hooray! You have a surprise!' : 'Hooray! You did it!', msg);
}

function noWords(root) {
  const buddy = createBuddy({ cls: 'big' });
  root.append(h('div', { class: 'screen end-screen' },
    h('div', { class: 'end-layout' }, buddy.el,
      h('div', { class: 'panel end-panel' },
        h('h1', {}, 'No words yet!'),
        h('p', {}, 'Ask a grown-up to choose some spelling words.'),
        h('div', { class: 'end-buttons' }, btn('🏠 Home', 'primary big', () => go('home')))))));
  buddy.talk('Ask a grown-up to choose some spelling words for you.');
}
