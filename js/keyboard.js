// Big on-screen keyboard. Works with touch, mouse and the Chromebook's own keys
// (physical key presses are passed in by the screen that owns the keyboard).

import { h } from './ui.js';
import { state } from './state.js';

const LAYOUTS = {
  qwerty: ['qwertyuiop', "asdfghjkl'", 'zxcvbnm'],
  abc: ['abcdefghi', 'jklmnopqr', "stuvwxyz'"],
};

export function createKeyboard(host, { onKey }) {
  const rows = LAYOUTS[state.settings.keyboardLayout] || LAYOUTS.qwerty;
  const keys = new Map();
  const extra = h('div', { class: 'kbd-row kbd-extra' });

  const press = (k, el) => (ev) => {
    ev.preventDefault();
    if (root.classList.contains('off')) return;
    if (el) {
      el.classList.remove('pressed');
      void el.offsetWidth;
      el.classList.add('pressed');
    }
    onKey(k);
  };

  const makeKey = (k, label, cls = '') => {
    const el = h('button', {
      class: 'key ' + cls,
      type: 'button',
      tabindex: '-1',
      'data-key': k,
      'aria-label': k === 'Backspace' ? 'delete' : k === ' ' ? 'space' : k,
    }, label);
    el.addEventListener('pointerdown', press(k, el));
    el.addEventListener('animationend', () => el.classList.remove('pressed'));
    keys.set(k, el);
    return el;
  };

  const root = h('div', { class: 'kbd' },
    rows.map((r, i) => h('div', { class: 'kbd-row' },
      [...r].map((c) => makeKey(c, c, c === "'" ? 'apos' : '')),
      i === rows.length - 1 ? makeKey('Backspace', '⌫', 'wide back') : null)),
    extra);

  host.append(root);
  if (!state.settings.showKeyboard) root.classList.add('hidden');

  return {
    el: root,
    enable(on = true) { root.classList.toggle('off', !on); },
    // Show "-" and space keys only for words that need them.
    setExtras(word = '') {
      extra.innerHTML = '';
      for (const k of ['-', ' ']) keys.delete(k);
      if (word.includes('-')) extra.append(makeKey('-', '-', 'apos'));
      if (word.includes(' ')) extra.append(makeKey(' ', 'space', 'wide space'));
    },
    hint(letter) {
      const el = keys.get(String(letter).toLowerCase());
      if (!el) return;
      el.classList.remove('hint');
      void el.offsetWidth;
      el.classList.add('hint');
    },
    clearHints() { keys.forEach((el) => el.classList.remove('hint')); },
    flash(letter) {
      const el = keys.get(String(letter).toLowerCase());
      if (!el) return;
      el.classList.remove('pressed');
      void el.offsetWidth;
      el.classList.add('pressed');
    },
  };
}

// Normalise a KeyboardEvent key to what the game understands, or null.
export function gameKey(key) {
  if (key === 'Backspace' || key === 'Enter' || key === ' ') return key;
  if (key === '’' || key === '`') return "'";
  if (key.length === 1 && /[a-z'\-]/i.test(key)) return key.toLowerCase();
  return null;
}
