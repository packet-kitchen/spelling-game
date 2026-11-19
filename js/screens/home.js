// Start screen ("tap to start" — needed so the browser allows sound) and Home.
import { h, sparkleBurst } from '../ui.js';
import { state, giftProgress, pendingGifts, focusList, activeEntries } from '../state.js';
import { unlockAudio, sfx } from '../sfx.js';
import { speak } from '../speech.js';
import { go, setKeyHandler } from '../router.js';
import { createBuddy } from '../buddy.js';
import { getUnicorn, unicornSVG } from '../unicorns.js';
import { btn } from './play.js';
import { stageOf } from '../scheduler.js';
import { voiceStatus, onVoiceStatus } from '../voice/neural.js';

export function startScreen(root) {
  let started = false;
  const start = () => {
    if (started) return;
    started = true;
    unlockAudio();
    speak(' '); // wake up the speech engine inside the tap
    sfx.sparkle();
    go('home', { greet: true });
  };
  const button = btn('✨ Tap to start ✨', 'primary huge start-btn', start);
  root.append(h('div', { class: 'screen start-screen', onclick: start },
    h('div', { class: 'start-card' },
      h('div', { class: 'start-pic', html: unicornSVG(getUnicorn(state.buddy), { mood: 'happy' }) }),
      h('h1', { class: 'game-title' }, 'Unicorn Spelling'),
      button)));
  setKeyHandler((k) => {
    if (k === 'Enter' || k === ' ') { start(); return true; }
    return false;
  });
}

export function homeScreen(root, params = {}) {
  const buddy = createBuddy({ cls: 'big' });
  const gp = giftProgress();
  const gifts = pendingGifts();
  const focus = focusList();
  const entries = activeEntries();
  const name = state.settings.childName;

  const meter = gp.done
    ? h('div', { class: 'meter-text' }, 'You found all the unicorns! 🌈')
    : h('div', { class: 'meter' },
      h('div', { class: 'meter-bar' }, h('div', { class: 'meter-fill', style: { width: `${Math.min(100, (gp.have / gp.need) * 100)}%` } })),
      h('div', { class: 'meter-text' }, gifts > 0 ? 'A surprise is waiting!' : `${gp.need - gp.have} more ⭐ for a surprise`));

  const mastered = entries.filter((e) => stageOf(state.progress[e.key]) === 'mastered').length;
  const voiceChip = h('span', { class: 'voice-chip', hidden: true });

  const menu = h('div', { class: 'menu' },
    gifts > 0 ? btn(h('span', {}, '🎁 Open your surprise!'), 'menu-btn gift-btn', () => { sfx.pop(); go('gift'); }) : null,
    btn([h('span', { class: 'mb-icon' }, '🌈'), h('span', { class: 'mb-text' }, 'Magic Mission', h('small', {}, `Spell ${state.settings.wordsPerMission} words`))],
      'menu-btn mission-btn', () => { sfx.pop(); go('mission'); }),
    focus ? btn([h('span', { class: 'mb-icon' }, '📝'), h('span', { class: 'mb-text' }, 'Practice Test', h('small', {}, focus.name))],
      'menu-btn test-btn', () => { sfx.pop(); go('test'); }) : null,
    btn([h('span', { class: 'mb-icon' }, '🦄'), h('span', { class: 'mb-text' }, 'My Unicorns', h('small', {}, `${state.unicorns.length} ${state.unicorns.length === 1 ? 'friend' : 'friends'}`))],
      'menu-btn stable-btn', () => { sfx.pop(); go('stable'); }));

  const screen = h('div', { class: 'screen home-screen' },
    h('header', { class: 'home-top' },
      h('h1', { class: 'game-title' }, 'Unicorn Spelling'),
      h('div', { class: 'stars-box' },
        h('div', { class: 'stars-total' }, '⭐ ', h('b', {}, String(state.stars)), ' stars'),
        meter)),
    h('main', { class: 'home-main' }, buddy.el, menu),
    h('footer', { class: 'home-foot' },
      h('span', { class: 'mastered' }, mastered ? `🏅 ${mastered} words mastered` : ''),
      voiceChip,
      btn('⚙️ Grown-ups', 'grownups', () => go('parent'))));
  root.append(screen);
  const showVoice = (st) => {
    const busy = st.status === 'downloading' || st.status === 'starting';
    voiceChip.hidden = !busy;
    voiceChip.textContent = st.status === 'downloading'
      ? `🎙️ Getting the unicorn voice… ${Math.round((st.progress || 0) * 100)}%`
      : '🎙️ Getting the unicorn voice ready…';
  };
  showVoice(voiceStatus);
  const stopVoiceChip = onVoiceStatus(showVoice);

  const hi = name ? `Hi ${name}!` : 'Hi there!';
  let text;
  let speech;
  if (gifts > 0) {
    text = `${hi} You have a surprise waiting!`;
    speech = [hi, 'You have a surprise waiting! Tap the present.'];
  } else if (!entries.length) {
    text = `${hi} Ask a grown-up to choose your spelling words.`;
    speech = text;
  } else {
    text = `${hi} Ready for some magic spelling?`;
    speech = [hi, 'Ready for some magic spelling?', 'Tap the rainbow to start a mission.'];
  }
  if (params.greet || !params.quiet) buddy.talk(text, speech);
  else buddy.show(text);

  setKeyHandler((k) => {
    if (k === 'Enter') { sfx.pop(); go(gifts > 0 ? 'gift' : 'mission'); return true; }
    return false;
  });

  if (gifts > 0) setTimeout(() => sparkleBurst(menu.firstChild, 14), 300);
  return stopVoiceChip;
}
