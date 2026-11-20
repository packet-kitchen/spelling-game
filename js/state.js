// Saved data lives in this browser's localStorage (on the Chromebook only).
// Grown-ups can download a backup file from the parent area.

import { BUILT_IN_LISTS } from './words.js';
import { parseMarked, wordKey, cleanWord } from './wordutils.js';
import { UNICORNS, starsNeededFor } from './unicorns.js';

const KEY = 'unicorn-spelling-v1';
export const STATE_VERSION = 1;

export function defaultState() {
  const builtInOn = {};
  for (const l of BUILT_IN_LISTS) builtInOn[l.id] = !!l.defaultOn;
  return {
    version: STATE_VERSION,
    settings: {
      childName: 'Amy',
      wordsPerMission: 8,
      voiceEngine: 'eleven', // 'eleven' (Alice), 'piper' (Cori, offline) or 'browser' (Chromebook voices)
      voiceChosen: false, // set once a grown-up picks a voice in Settings
      piperVoice: 'en_GB-cori-medium',
      voiceURI: '',
      rate: 0.85,
      sounds: true,
      calm: false,
      builtInOn,
    },
    customLists: [], // { id, name, active, words: [{ text, tricky: [], sentence }], created }
    focusListId: null, // "this week's list"
    progress: {}, // wordKey -> progress (see scheduler.js)
    stars: 0,
    unicorns: ['sparkle'],
    buddy: 'sparkle',
    tests: [], // { date, listName, results: [{ word, attempt, right }] }
    sessions: [], // { date, kind, words, firstTry, stars }
    created: Date.now(),
  };
}

export let state = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultState();
    return migrate(JSON.parse(raw));
  } catch (e) {
    console.warn('Could not load saved data', e);
    return defaultState();
  }
}

export function migrate(data) {
  const d = defaultState();
  if (!data || typeof data !== 'object') return d;
  const out = { ...d, ...data };
  out.settings = { ...d.settings, ...(data.settings || {}) };
  out.settings.builtInOn = { ...d.settings.builtInOn, ...((data.settings || {}).builtInOn || {}) };
  // Until a grown-up chooses a voice, use the current recommended one.
  if (!out.settings.voiceChosen) out.settings.voiceEngine = d.settings.voiceEngine;
  if (!Array.isArray(out.customLists)) out.customLists = [];
  if (!Array.isArray(out.unicorns) || !out.unicorns.length) out.unicorns = ['sparkle'];
  out.unicorns = out.unicorns.filter((id) => UNICORNS.some((u) => u.id === id));
  if (!out.unicorns.length) out.unicorns = ['sparkle'];
  if (!out.unicorns.includes(out.buddy)) out.buddy = out.unicorns[0];
  if (typeof out.progress !== 'object' || !out.progress) out.progress = {};
  if (!Array.isArray(out.tests)) out.tests = [];
  if (!Array.isArray(out.sessions)) out.sessions = [];
  out.version = STATE_VERSION;
  return out;
}

let saveTimer = null;
export function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveNow, 50);
}
export function saveNow() {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
    return true;
  } catch (e) {
    console.warn('Could not save', e);
    return false;
  }
}

export function replaceState(next) {
  state = migrate(next);
  saveNow();
}

export function resetState() {
  state = defaultState();
  saveNow();
}

// ---------------------------------------------------------------------------
// Word entries

let builtInCache = null;
export function builtInLists() {
  if (!builtInCache) {
    builtInCache = BUILT_IN_LISTS.map((l) => ({
      ...l,
      builtIn: true,
      words: l.words.map((w) => {
        const [marked, sentence = ''] = w.split('|');
        const { text, tricky } = parseMarked(marked);
        return { text, tricky, sentence };
      }),
    }));
  }
  return builtInCache;
}

export function allLists() {
  const custom = state.customLists.map((l) => ({ ...l, builtIn: false }));
  return [...custom, ...builtInLists()];
}

export function isListActive(list) {
  if (list.builtIn) return !!state.settings.builtInOn[list.id];
  return list.active !== false;
}

export function findList(id) {
  return allLists().find((l) => l.id === id) || null;
}

function toEntry(w, list) {
  return {
    key: wordKey(w.text),
    text: cleanWord(w.text),
    tricky: w.tricky || [],
    sentence: w.sentence || '',
    listId: list.id,
    listName: list.name,
    focus: list.id === state.focusListId,
  };
}

// Every word the child is currently practising, de-duplicated.
// This week's list comes first, then custom lists, then built-in lists.
export function activeEntries() {
  const lists = allLists().filter((l) => isListActive(l) || l.id === state.focusListId);
  lists.sort((a, b) => (b.id === state.focusListId) - (a.id === state.focusListId));
  const seen = new Set();
  const out = [];
  for (const l of lists) {
    for (const w of l.words) {
      const e = toEntry(w, l);
      if (seen.has(e.key)) continue;
      seen.add(e.key);
      out.push(e);
    }
  }
  return out;
}

export function focusList() {
  if (!state.focusListId) return null;
  const l = findList(state.focusListId);
  return l && l.words.length ? l : null;
}

export function focusEntries() {
  const l = focusList();
  return l ? l.words.map((w) => toEntry(w, l)) : [];
}

// ---------------------------------------------------------------------------
// Rewards

// Index of the next surprise (1 = first surprise after the starter unicorn)
export function nextGiftIndex() {
  return state.unicorns.length;
}
export function allUnicornsFound() {
  return state.unicorns.length >= UNICORNS.length;
}
export function giftProgress() {
  const k = nextGiftIndex();
  if (allUnicornsFound()) return { have: 0, need: 0, done: true };
  const start = starsNeededFor(k - 1);
  const end = starsNeededFor(k);
  return { have: Math.max(0, state.stars - start), need: end - start, done: false };
}
// Unicorns that have been earned but not yet unwrapped.
export function pendingGifts() {
  let n = 0;
  let k = nextGiftIndex();
  while (state.unicorns.length + n < UNICORNS.length && state.stars >= starsNeededFor(k)) {
    n++;
    k++;
  }
  return n;
}
export function unwrapGift() {
  const next = UNICORNS.find((u) => !state.unicorns.includes(u.id));
  if (!next) return null;
  state.unicorns.push(next.id);
  save();
  return next;
}

export function newId() {
  return 'l' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}
