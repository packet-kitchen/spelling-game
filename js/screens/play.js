// Shared layout + activities used by the Magic Mission and the Practice Test.
import { h, clear, wait, sparkleBurst, shake, pop, pick, dialog } from '../ui.js';
import { state } from '../state.js';
import { trickyFor, compareSpelling, blankSentence, decoyLetters, scrambleTiles, sameLetter } from '../wordutils.js';
import { say, stop } from '../speech.js';
import { sfx } from '../sfx.js';
import { go, setKeyHandler } from '../router.js';
import { createBuddy } from '../buddy.js';
import { starsFor } from '../scheduler.js';

import { PRAISE, PRAISE_SECOND, PRAISE_EFFORT, NEARLY, missedPhrase, withName } from '../voice/phrases.js';

export function btn(label, cls, onClick, attrs = {}) {
  const b = h('button', { class: 'btn ' + (cls || ''), type: 'button', tabindex: '-1', ...attrs }, label);
  b.addEventListener('mousedown', (e) => e.preventDefault());
  b.addEventListener('click', (e) => {
    e.preventDefault();
    if (b.disabled) return;
    onClick(e);
  });
  return b;
}

function wordParts(e) {
  return e.sentence ? [e.text, e.sentence, e.text] : [e.text, 600, e.text];
}

// The Chromebook's own keyboard is used for typing. Turn a KeyboardEvent key
// into what the game understands, or null.
export function gameKey(key) {
  if (key === 'Backspace' || key === 'Enter' || key === ' ') return key;
  if (key === '\u2019' || key === '`') return "'";
  if (key.length === 1 && /[a-z'\-]/i.test(key)) return key.toLowerCase();
  return null;
}

// ---------------------------------------------------------------------------
// Layout: top bar (home, rainbow progress, stars), buddy, stage.
export function createPlay(root, { kind = 'mission', label = '' } = {}) {
  const session = { dead: false };
  let roundKeys = null;

  const fill = h('div', { class: 'rainbow-fill' });
  const runner = h('div', { class: 'rainbow-runner' }, '🦄');
  const track = h('div', { class: 'rainbow-track', title: 'Progress' }, fill, runner);
  const starNum = h('span', { class: 'star-num' }, String(state.stars));
  const starEl = h('div', { class: 'star-count', 'aria-label': 'Stars' }, h('span', { class: 'star-icon' }, '⭐'), starNum);
  const exitBtn = btn('🏠', 'icon-btn', () => askExit(), { 'aria-label': 'Go home', title: 'Go home' });
  const top = h('div', { class: 'topbar' }, exitBtn, label ? h('div', { class: 'play-label' }, label) : null, track, starEl);

  const buddy = createBuddy({ alive: () => !session.dead });
  const stage = h('div', { class: 'stage' });
  const controls = h('div', { class: 'controls' });
  const screen = h('div', { class: `screen play-screen ${kind}` },
    top,
    h('div', { class: 'play' }, h('div', { class: 'buddy-col' }, buddy.el), h('div', { class: 'stage-col' }, stage, controls)));
  root.append(screen);

  function handle(k) {
    if (session.dead || !roundKeys) return false;
    return roundKeys(k);
  }

  setKeyHandler((key) => {
    const k = gameKey(key);
    if (k === null) return false;
    return handle(k);
  });

  async function askExit() {
    sfx.tap();
    const keep = roundKeys;
    roundKeys = null;
    say('Do you want to stop playing?');
    const v = await dialog({
      title: 'Stop playing?',
      body: 'Your stars are saved.',
      buttons: [
        { label: 'Keep playing 🦄', value: false, class: 'primary' },
        { label: 'Stop', value: true },
      ],
    });
    if (v) {
      session.dead = true;
      go('home');
    } else {
      roundKeys = keep;
      stop();
    }
  }

  const ctx = {
    session,
    screen,
    stage,
    controls,
    buddy,
    told: {},
    alive: () => !session.dead,
    setKeys(fn) {
      roundKeys = fn;
    },
    show(middle, buttons = []) {
      clear(stage);
      clear(controls);
      stage.append(...[].concat(middle).filter(Boolean));
      controls.append(...[].concat(buttons).filter(Boolean));
    },
    setProgress(fraction) {
      const pct = Math.max(0, Math.min(1, fraction)) * 100;
      fill.style.clipPath = `inset(0 ${100 - pct}% 0 0 round 99px)`;
      runner.style.left = `clamp(18px, ${pct}%, calc(100% - 18px))`;
    },
    addStars(n) {
      state.stars += n;
      starNum.textContent = String(state.stars);
      pop(starEl);
      const fly = h('div', { class: 'star-fly' }, `+${n} ⭐`);
      starEl.append(fly);
      setTimeout(() => fly.remove(), 1200);
    },
    destroy() {
      session.dead = true;
      stop();
    },
  };
  ctx.setProgress(0);
  return ctx;
}

// ---------------------------------------------------------------------------
// Pieces of the stage

export function wordEl(text, tricky = new Set(), { cls = '', marks = null } = {}) {
  return h('div', { class: 'word-big ' + cls, 'aria-label': text },
    [...text].map((c, i) => (c === ' '
      ? h('span', { class: 'gap' })
      : h('span', { class: 'ch' + (tricky.has(i) ? ' tricky' : '') + (marks ? ' ' + marks[i] : '') }, c))));
}

function hearBtn(e, intro) {
  return btn('🔊 Hear it', 'hear', () => {
    sfx.tap();
    say(intro ? [intro, ...wordParts(e)] : wordParts(e));
  });
}

function sentenceEl(e, { blank = true } = {}) {
  if (!e.sentence) return null;
  return h('p', { class: 'sentence' }, blank ? blankSentence(e.sentence, e.text) : e.sentence);
}

// ---------------------------------------------------------------------------
// Phases

// LOOK: show the word with the tricky bit highlighted until the child is ready.
function lookPhase(ctx, e, { again = false } = {}) {
  return new Promise((resolve) => {
    const tricky = new Set(trickyFor(e));
    let started = false;
    const begin = (firstKey) => {
      if (started) return;
      started = true;
      sfx.pop();
      ctx.setKeys(null);
      resolve(firstKey);
    };
    const ready = btn("I'm ready! ✨", 'primary big', () => begin(null));
    ctx.show([h('div', { class: 'phase-tag' }, '👀 Look'), wordEl(e.text, tricky, { cls: 'look' }), sentenceEl(e, { blank: false })],
      [hearBtn(e), ready]);
    ctx.setKeys((k) => {
      if (k === 'Enter') { begin(null); return true; }
      if (k === 'Backspace') return true;
      if (k.length === 1 && (k !== ' ' || e.text.includes(' '))) { begin(k); return true; }
      return false;
    });
    if (again) {
      ctx.buddy.talk('Look at the word again. Look at the pink letters.', ['Look again.', e.text, 'Look at the pink letters.']);
    } else if (!ctx.told.look) {
      ctx.told.look = true;
      ctx.buddy.talk('A new word! Look carefully at the pink letters. Then press "I\'m ready".',
        ['A new word!', ...wordParts(e), 'Look carefully at the pink letters. When you have remembered it, press, I\'m ready.']);
    } else {
      ctx.buddy.talk('A new word! Look carefully at the pink letters.', ['A new word!', ...wordParts(e), 'Look at the pink letters.']);
    }
  });
}

// TYPE: the child types the word. Resolves with what they typed.
// mode: 'listen' (hear the word), 'cover' (after looking), 'test'
function typePhase(ctx, e, { mode = 'listen', firstKey = null, intro = '' } = {}) {
  return new Promise((resolve) => {
    const typed = [];
    const maxLen = e.text.length + 6;
    const line = h('div', { class: 'typed-line', 'aria-live': 'polite' });
    const check = btn(mode === 'test' ? 'Next ➜' : '✓ Check', 'primary big check', () => submit());

    let topEl;
    if (mode === 'cover') {
      topEl = h('div', { class: 'cover' }, h('span', { class: 'cloud' }, '☁️'), h('span', { class: 'cover-text' }, 'Now spell it!'));
    } else {
      topEl = btn('🔊', 'speaker', () => {
        sfx.tap();
        say(intro ? [intro, ...wordParts(e)] : wordParts(e));
      }, { 'aria-label': 'Hear the word' });
    }
    const tag = mode === 'cover' ? '✏️ Cover and write' : mode === 'test' ? '' : '👂 Listen and spell';
    ctx.show([tag ? h('div', { class: 'phase-tag' }, tag) : null, topEl, mode === 'cover' ? null : sentenceEl(e), line],
      [mode === 'cover' ? hearBtn(e) : null, check]);

    const draw = () => {
      clear(line);
      for (const c of typed) line.append(h('span', { class: 'ch' }, c === ' ' ? ' ' : c));
      line.append(h('span', { class: 'caret' }));
      check.classList.toggle('dim', typed.length === 0);
    };

    const submit = () => {
      if (!typed.length) {
        shake(line);
        ctx.buddy.talk('Type the word first, then press check.');
        return;
      }
      ctx.setKeys(null);
      resolve(typed.join(''));
    };

    ctx.setKeys((k) => {
      if (k === 'Enter') { submit(); return true; }
      if (k === 'Backspace') {
        if (typed.length) { typed.pop(); sfx.key(); draw(); }
        return true;
      }
      if (k === ' ' && !e.text.includes(' ')) return true;
      if (typed.length >= maxLen) { shake(line); return true; }
      typed.push(k);
      sfx.key();
      draw();
      return true;
    });
    if (firstKey) typed.push(firstKey);
    draw();

    if (mode === 'listen') {
      if (!ctx.told.listen) {
        ctx.told.listen = true;
        ctx.buddy.talk('Listen, then spell the word. Press check when you have finished.',
          ['Listen, and spell the word.', ...wordParts(e), 'Press check when you have finished.']);
      } else {
        ctx.buddy.talk('Listen and spell the word.', ['Spell', ...wordParts(e)]);
      }
    } else if (mode === 'cover') {
      ctx.buddy.talk('Now spell it from memory!', ['Now spell', e.text]);
    } else if (mode === 'test') {
      ctx.buddy.talk(intro || 'Spell the word.', [intro, ...wordParts(e)].filter(Boolean));
    }
  });
}

// FEEDBACK: what they wrote vs. the magic spelling, mistakes in pink.
function feedbackPhase(ctx, e, typed, cmp, { final = false } = {}) {
  return new Promise((resolve) => {
    const yours = h('div', { class: 'fb-row' },
      h('div', { class: 'fb-label' }, 'You wrote'),
      h('div', { class: 'word-small' }, [...typed].map((c, i) => h('span', { class: 'ch ' + cmp.attemptMarks[i] }, c === ' ' ? ' ' : c))));
    const right = h('div', { class: 'fb-row' },
      h('div', { class: 'fb-label' }, 'Magic spelling'),
      wordEl(e.text, new Set(), { marks: cmp.targetMarks, cls: 'fb-word' }));
    const done = () => {
      ctx.setKeys(null);
      sfx.tap();
      resolve();
    };
    const next = btn(final ? "Let's write it together ➜" : 'Try again ➜', 'primary big', done);
    ctx.show([h('div', { class: 'feedback' }, yours, right)], [next]);
    sfx.oops();
    ctx.buddy.setMood('normal');
    const n = [...e.text].filter((c) => c !== ' ').length;
    const nearly = pick(NEARLY);
    const got = cmp.matches > 0 ? `You got ${cmp.matches} out of ${n} letters right.` : '';
    ctx.buddy.talk(`${nearly} ${got} Look at the pink letters.`.replace(/\s+/g, ' '),
      [nearly, cmp.matches > 0 ? missedPhrase(n - cmp.matches) : '', 'Look at the pink letters.', e.text].filter(Boolean));
    ctx.setKeys((k) => {
      if (k === 'Enter') { done(); return true; }
      return true;
    });
  });
}

// COPY: errorless copying with the word on screen. Only the right letter goes in.
function copyPhase(ctx, e) {
  return new Promise((resolve) => {
    const chars = [...e.text];
    let pos = 0;
    const skipSpaces = () => { while (chars[pos] === ' ') pos++; };
    const model = wordEl(e.text, new Set(), { cls: 'model' });
    const modelChars = [...model.children];
    const line = h('div', { class: 'typed-line copy' });
    ctx.show([h('div', { class: 'phase-tag' }, '✏️ Copy it'), model, line], [hearBtn(e)]);
    const draw = () => {
      clear(line);
      for (let i = 0; i < pos; i++) line.append(h('span', { class: 'ch' }, chars[i] === ' ' ? ' ' : chars[i]));
      if (pos < chars.length) line.append(h('span', { class: 'caret' }));
      modelChars.forEach((el, i) => el.classList.toggle('done', i < pos));
      modelChars.forEach((el, i) => el.classList.toggle('next', i === pos));
    };
    draw();
    ctx.buddy.talk("Let's write it together. Copy the letters one by one.", ["Let's write it together.", e.text, 'Copy the letters one by one.']);
    ctx.setKeys((k) => {
      if (k === 'Enter' || k === 'Backspace') return true;
      if (sameLetter(k, chars[pos])) {
        pos++;
        skipSpaces();
        sfx.key();
        draw();
        if (pos >= chars.length) {
          ctx.setKeys(null);
          resolve();
        }
      } else {
        sfx.wobble();
        shake(modelChars[pos]);
      }
      return true;
    });
  });
}

// MISSING LETTERS: fill the gaps (the tricky bit).
function missingPhase(ctx, e, idx, attempt) {
  return new Promise((resolve) => {
    const chars = [...e.text];
    const blanks = new Map(idx.map((i, j) => [i, j]));
    const filled = new Array(idx.length).fill('');
    const boxes = [];
    const word = h('div', { class: 'word-big missing' }, chars.map((c, i) => {
      if (c === ' ') return h('span', { class: 'gap' });
      if (blanks.has(i)) {
        const b = h('span', { class: 'ch blank' }, ' ');
        boxes.push(b);
        return b;
      }
      return h('span', { class: 'ch' }, c);
    }));
    ctx.show([h('div', { class: 'phase-tag' }, '🧩 Missing letters'), word, sentenceEl(e, { blank: false })], [hearBtn(e)]);
    let n = 0;
    const draw = () => boxes.forEach((b, j) => {
      b.textContent = filled[j] || ' ';
      b.classList.toggle('current', j === n);
      b.classList.toggle('full', !!filled[j]);
    });
    draw();
    ctx.setKeys((k) => {
      if (k === 'Enter') return true;
      if (k === 'Backspace') {
        if (n > 0) { n--; filled[n] = ''; sfx.key(); draw(); }
        return true;
      }
      if (k === ' ') return true;
      if (n >= filled.length) return true;
      filled[n++] = k;
      sfx.key();
      draw();
      if (n >= filled.length) {
        ctx.setKeys(() => true);
        setTimeout(() => resolve(filled.slice()), 350);
      }
      return true;
    });
    const plural = idx.length > 1 ? 'letters' : 'letter';
    if (attempt === 1) {
      ctx.buddy.talk(`Fill in the missing ${plural}.`, [`Fill in the missing ${plural}.`, ...wordParts(e)]);
    } else {
      ctx.buddy.talk('Have another go!', ['Have another go!', e.text]);
    }
  });
}

// LETTER TILES: put the letters in order. Wrong tiles wobble back.
function tilesPhase(ctx, e) {
  return new Promise((resolve) => {
    const chars = [...e.text];
    const typeable = chars.filter((c) => c !== ' ');
    const decoys = decoyLetters(e.text, typeable.length >= 4 ? 2 : 1);
    const pool = scrambleTiles([...typeable.map((c) => c), ...decoys]);
    let pos = 0;
    let mistakes = 0;
    let slotMisses = 0;
    const skip = () => { while (chars[pos] === ' ') pos++; };
    skip();

    const slots = chars.map((c) => (c === ' ' ? h('span', { class: 'gap' }) : h('span', { class: 'ch slot' }, ' ')));
    const slotRow = h('div', { class: 'word-big slots' }, slots);
    const tiles = pool.map((c) => {
      const t = btn(c, 'tile', () => tryTile(t));
      t.dataset.letter = c;
      return t;
    });
    const tray = h('div', { class: 'tray' }, tiles);
    ctx.show([h('div', { class: 'phase-tag' }, '🔤 Letter tiles'), slotRow, tray, sentenceEl(e)], [hearBtn(e)]);

    const markCurrent = () => slots.forEach((s, i) => s.classList.toggle('current', i === pos));
    markCurrent();

    function tryTile(t) {
      if (!t || t.classList.contains('used')) return;
      if (sameLetter(t.dataset.letter, chars[pos])) {
        t.classList.add('used');
        slots[pos].textContent = chars[pos];
        slots[pos].classList.add('placed');
        pop(slots[pos]);
        sfx.key();
        slotMisses = 0;
        tiles.forEach((x) => x.classList.remove('hint'));
        pos++;
        skip();
        markCurrent();
        if (pos >= chars.length) {
          ctx.setKeys(() => true);
          const outcome = mistakes <= 1 ? 'first' : mistakes <= 3 ? 'second' : 'fail';
          setTimeout(() => resolve({ outcome, mistakes }), 300);
        }
      } else {
        mistakes++;
        slotMisses++;
        sfx.wobble();
        shake(t);
        if (slotMisses >= 2) {
          const right = tiles.find((x) => !x.classList.contains('used') && sameLetter(x.dataset.letter, chars[pos]));
          if (right) right.classList.add('hint');
        }
      }
    }

    ctx.setKeys((k) => {
      if (k === 'Enter' || k === 'Backspace' || k === ' ') return true;
      const free = tiles.filter((x) => !x.classList.contains('used') && sameLetter(x.dataset.letter, k));
      if (!free.length) {
        sfx.wobble();
        shake(tray);
        mistakes++;
        return true;
      }
      tryTile(free[0]);
      return true;
    });

    if (!ctx.told.tiles) {
      ctx.told.tiles = true;
      ctx.buddy.talk('Type or tap the letters in the right order. Watch out, there are some extra letters!',
        ['Put the letters in the right order to spell,', ...wordParts(e), 'Watch out! There are some extra letters.']);
    } else {
      ctx.buddy.talk('Put the letters in the right order.', ['Put the letters in order to spell,', ...wordParts(e)]);
    }
  });
}

// ---------------------------------------------------------------------------
// Rounds. Each returns { outcome: 'first' | 'second' | 'fail', lastWrong }

export async function roundLook(ctx, e) {
  let lastWrong = '';
  for (let attempt = 1; attempt <= 2; attempt++) {
    const firstKey = await lookPhase(ctx, e, { again: attempt > 1 });
    if (!ctx.alive()) return null;
    const typed = await typePhase(ctx, e, { mode: 'cover', firstKey });
    if (!ctx.alive()) return null;
    const cmp = compareSpelling(e.text, typed);
    if (cmp.correct) return { outcome: attempt === 1 ? 'first' : 'second', lastWrong };
    lastWrong = typed;
    await feedbackPhase(ctx, e, typed, cmp, { final: attempt === 2 });
    if (!ctx.alive()) return null;
  }
  await copyPhase(ctx, e);
  return { outcome: 'fail', lastWrong };
}

export async function roundSpell(ctx, e) {
  let lastWrong = '';
  for (let attempt = 1; attempt <= 2; attempt++) {
    let typed;
    if (attempt === 1) {
      typed = await typePhase(ctx, e, { mode: 'listen' });
    } else {
      const firstKey = await lookPhase(ctx, e, { again: true });
      if (!ctx.alive()) return null;
      typed = await typePhase(ctx, e, { mode: 'cover', firstKey });
    }
    if (!ctx.alive()) return null;
    const cmp = compareSpelling(e.text, typed);
    if (cmp.correct) return { outcome: attempt === 1 ? 'first' : 'second', lastWrong };
    lastWrong = typed;
    await feedbackPhase(ctx, e, typed, cmp, { final: attempt === 2 });
    if (!ctx.alive()) return null;
  }
  await copyPhase(ctx, e);
  return { outcome: 'fail', lastWrong };
}

export async function roundMissing(ctx, e) {
  const idx = trickyFor(e).slice().sort((a, b) => a - b);
  let lastWrong = '';
  for (let attempt = 1; attempt <= 2; attempt++) {
    const filled = await missingPhase(ctx, e, idx, attempt);
    if (!ctx.alive()) return null;
    const chars = [...e.text];
    idx.forEach((i, j) => { chars[i] = filled[j]; });
    const typed = chars.join('');
    const cmp = compareSpelling(e.text, typed);
    if (cmp.correct) return { outcome: attempt === 1 ? 'first' : 'second', lastWrong };
    lastWrong = typed;
    await feedbackPhase(ctx, e, typed, cmp, { final: attempt === 2 });
    if (!ctx.alive()) return null;
  }
  await copyPhase(ctx, e);
  return { outcome: 'fail', lastWrong };
}

export async function roundTiles(ctx, e) {
  const r = await tilesPhase(ctx, e);
  if (!ctx.alive()) return null;
  return { outcome: r.outcome, lastWrong: '' };
}

export async function roundTest(ctx, e, number, total) {
  const typed = await typePhase(ctx, e, { mode: 'test', intro: `Number ${number}.` });
  if (!ctx.alive()) return null;
  sfx.pop();
  return typed;
}

export const ROUNDS = { look: roundLook, spell: roundSpell, missing: roundMissing, tiles: roundTiles };

// Happy moment after a word. Returns the stars given.
export async function celebrate(ctx, e, outcome) {
  ctx.setKeys(() => true);
  const stars = starsFor(outcome);
  const win = wordEl(e.text, new Set(), { cls: 'win' });
  ctx.show([win], []);
  sfx.good();
  sparkleBurst(win, outcome === 'first' ? 22 : 12);
  ctx.addStars(stars);
  ctx.buddy.setMood('happy');
  ctx.buddy.bounce();
  let text;
  if (outcome === 'first') text = pick(PRAISE);
  else if (outcome === 'second') text = pick(PRAISE_SECOND);
  else text = pick(PRAISE_EFFORT);
  const shown = Math.random() < 0.35 ? withName(text, state.settings.childName) : text;
  await ctx.buddy.talk(`${shown}  +${stars} ⭐`, shown);
  if (!ctx.alive()) return stars;
  await wait(250);
  ctx.buddy.setMood('normal');
  return stars;
}
