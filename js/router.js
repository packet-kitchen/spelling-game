// Tiny screen router + one place that listens to the physical keyboard.
import { clear } from './ui.js';
import { stop } from './speech.js';

const screens = {};
let cleanup = null;
let keyHandler = null;
let app = null;

export function register(name, fn) {
  screens[name] = fn;
}

export function setKeyHandler(fn) {
  keyHandler = fn;
}

export function go(name, params = {}) {
  stop();
  if (typeof cleanup === 'function') {
    try { cleanup(); } catch (e) { console.error(e); }
  }
  cleanup = null;
  keyHandler = null;
  app = app || document.getElementById('app');
  clear(app);
  app.dataset.screen = name;
  window.scrollTo(0, 0);
  cleanup = screens[name](app, params);
}

document.addEventListener('keydown', (e) => {
  if (!keyHandler) return;
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (document.querySelector('.modal-back')) return;
  const t = e.target;
  if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable)) return;
  if (e.repeat && e.key !== 'Backspace') return;
  const handled = keyHandler(e.key, e);
  if (handled) e.preventDefault();
});
