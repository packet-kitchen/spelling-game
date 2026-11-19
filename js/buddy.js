// The unicorn buddy with a speech bubble. Everything it says is also spoken,
// because the player may not be able to read every instruction yet.
import { h, pop } from './ui.js';
import { state } from './state.js';
import { getUnicorn, unicornSVG } from './unicorns.js';
import { say } from './speech.js';
import { sfx } from './sfx.js';

export function createBuddy({ alive = () => true, cls = '' } = {}) {
  const text = h('span', { class: 'bubble-text' });
  let last = null;
  const again = h('button', { class: 'bubble-say', type: 'button', tabindex: '-1', 'aria-label': 'Say it again', title: 'Say it again' }, '🔊');
  again.addEventListener('mousedown', (e) => e.preventDefault());
  again.addEventListener('click', () => {
    sfx.tap();
    if (last) say(last);
  });
  const bubble = h('div', { class: 'bubble' }, text, again);
  const pic = h('div', { class: 'buddy-pic' });
  const el = h('div', { class: 'buddy ' + cls }, bubble, pic);
  let mood = 'normal';
  const draw = () => {
    pic.innerHTML = unicornSVG(getUnicorn(state.buddy), { mood });
  };
  draw();
  pic.addEventListener('click', () => {
    api.bounce();
    sfx.sparkle();
  });

  const api = {
    el,
    show(t) {
      text.textContent = t;
      pop(bubble);
    },
    // Show text and speak it (speech can be different from the text, e.g. include the word).
    talk(t, speech) {
      api.show(t);
      last = speech ?? t;
      if (!alive()) return Promise.resolve(false);
      return say(last);
    },
    setMood(m) {
      if (m !== mood) {
        mood = m;
        draw();
      }
    },
    bounce() {
      pic.classList.remove('bounce');
      void pic.offsetWidth;
      pic.classList.add('bounce');
    },
    redraw: draw,
  };
  return api;
}
