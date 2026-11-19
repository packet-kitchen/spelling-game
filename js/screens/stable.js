// "My Unicorns" collection and the surprise present.
import { h, sparkleBurst, pop } from '../ui.js';
import { state, save, giftProgress, pendingGifts, unwrapGift } from '../state.js';
import { UNICORNS, unicornSVG, getUnicorn } from '../unicorns.js';
import { sfx } from '../sfx.js';
import { say } from '../speech.js';
import { go, setKeyHandler } from '../router.js';
import { btn } from './play.js';

export function stableScreen(root) {
  const gp = giftProgress();
  const grid = h('div', { class: 'stable-grid' });
  const nextLocked = UNICORNS.find((u) => !state.unicorns.includes(u.id));

  const draw = () => {
    grid.innerHTML = '';
    // owned first (in the order found), then locked
    const owned = state.unicorns.map(getUnicorn);
    const locked = UNICORNS.filter((u) => !state.unicorns.includes(u.id));
    for (const u of owned) {
      const isBuddy = u.id === state.buddy;
      const card = btn([
        h('div', { class: 'card-pic', html: unicornSVG(u, { mood: isBuddy ? 'happy' : 'normal' }) }),
        h('div', { class: 'card-name' }, u.name),
        isBuddy ? h('div', { class: 'badge' }, '💖 Buddy') : null,
      ], 'u-card' + (isBuddy ? ' buddy-card' : ''), () => choose(u, card));
      grid.append(card);
    }
    for (const u of locked) {
      const isNext = u === nextLocked;
      const card = btn([
        h('div', { class: 'card-pic', html: unicornSVG(u, { silhouette: true }) }),
        h('div', { class: 'card-name' }, isNext && !gp.done ? `⭐ ${gp.have} / ${gp.need}` : '???'),
      ], 'u-card locked' + (isNext ? ' next' : ''), () => {
        sfx.wobble();
        say(isNext ? `Earn ${Math.max(0, gp.need - gp.have)} more stars to find this unicorn!` : 'Keep spelling to find this unicorn!');
      });
      grid.append(card);
    }
  };

  function choose(u, card) {
    sfx.sparkle();
    sparkleBurst(card, 10);
    if (state.buddy !== u.id) {
      state.buddy = u.id;
      save();
      say(`${u.name} is your buddy now!`);
      draw();
    } else {
      say(`Hello! I'm ${u.name}!`);
    }
  }

  draw();
  root.append(h('div', { class: 'screen stable-screen' },
    h('header', { class: 'page-top' },
      btn('🏠', 'icon-btn', () => go('home', { quiet: true }), { 'aria-label': 'Home' }),
      h('h1', {}, 'My Unicorns'),
      h('div', { class: 'count' }, `${state.unicorns.length} / ${UNICORNS.length}`)),
    h('p', { class: 'hint-text' }, 'Tap a unicorn to make it your buddy.'),
    grid));
  say(state.unicorns.length === 1 ? 'You have 1 unicorn friend.' : `You have ${state.unicorns.length} unicorn friends.`, 'Tap a unicorn to make it your buddy.');
  setKeyHandler(() => false);
}

export function giftScreen(root) {
  if (pendingGifts() <= 0) {
    go('home', { quiet: true });
    return;
  }
  const box = h('button', { class: 'present', type: 'button', 'aria-label': 'Open the present' },
    h('span', { class: 'present-emoji' }, '🎁'));
  const area = h('div', { class: 'gift-area' }, box);
  const title = h('h1', {}, 'A surprise for you!');
  const hint = h('p', { class: 'hint-text' }, 'Tap the present!');
  const buttons = h('div', { class: 'end-buttons' });
  root.append(h('div', { class: 'screen gift-screen' }, h('div', { class: 'panel gift-panel' }, title, area, hint, buttons)));
  say('A surprise for you! Tap the present to open it.');

  let opened = false;
  let revealed = false;
  const open = () => {
    if (opened) return;
    opened = true;
    box.classList.add('opening');
    sfx.pop();
    setTimeout(() => {
      const u = unwrapGift();
      if (!u) return go('home', { quiet: true });
      area.innerHTML = '';
      const pic = h('div', { class: 'reveal', html: unicornSVG(u, { mood: 'happy' }) });
      area.append(pic);
      sfx.fanfare();
      sparkleBurst(pic, 36);
      title.textContent = `Meet ${u.name}!`;
      hint.textContent = `${u.name} wants to be your friend.`;
      say(`Wow! Meet ${u.name}!`, `${u.name} wants to be your friend.`);
      const more = pendingGifts() > 0;
      revealed = true;
      buttons.append(
        btn(`💖 Make ${u.name} my buddy`, 'big', () => {
          state.buddy = u.id;
          save();
          sfx.sparkle();
          say(`${u.name} is your buddy now!`);
          pop(pic);
          sparkleBurst(pic, 12);
        }),
        btn(more ? '🎁 Next surprise ➜' : 'Yay! ➜', 'primary big', () => go(more ? 'gift' : 'home', { quiet: true })));
    }, 900);
  };
  box.addEventListener('click', open);
  setKeyHandler((k) => {
    if (k === 'Enter' || k === ' ') {
      if (!opened) open();
      else if (revealed) go(pendingGifts() > 0 ? 'gift' : 'home', { quiet: true });
      return true;
    }
    return false;
  });
}
