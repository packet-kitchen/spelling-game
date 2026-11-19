// Grown-ups area: school word lists, progress and settings.
import { h, clear, shake, formatDate, dialog } from '../ui.js';
import {
  state, save, saveNow, builtInLists, allLists, isListActive, findList, newId,
  replaceState, resetState, defaultState, activeEntries,
} from '../state.js';
import { parseWordInput, wordKey, cleanWord, trickyFor, sentenceHasWord } from '../wordutils.js';
import { stageOf, STAGE_LABEL, blankProgress } from '../scheduler.js';
import { englishVoices, chosenVoice, sayWord, say, speechAvailable } from '../speech.js';
import { go, setKeyHandler } from '../router.js';
import { UNICORNS } from '../unicorns.js';
import * as voice from '../voice/neural.js';
import { commonPhrases, entryPhrases } from '../voice/phrases.js';

// ---------------------------------------------------------------------------
// Gate: a sum that a 7-year-old is unlikely to know yet.
export function parentGate(root) {
  setKeyHandler(null);
  let a = 0;
  let b = 0;
  const q = h('span', {});
  const newSum = () => {
    a = 6 + Math.floor(Math.random() * 4);
    b = 6 + Math.floor(Math.random() * 4);
    q.textContent = `${a} × ${b} = `;
  };
  newSum();
  const input = h('input', { type: 'text', inputmode: 'numeric', autocomplete: 'off', class: 'gate-input', 'aria-label': 'Answer' });
  const form = h('form', { class: 'panel gate-panel', onsubmit: (e) => {
    e.preventDefault();
    if (Number(input.value.trim()) === a * b) {
      go('parentHome');
    } else {
      shake(form);
      input.value = '';
      newSum();
      input.focus();
    }
  } },
  h('h1', {}, 'Grown-ups only'),
  h('p', {}, 'To open the grown-ups area, please answer:'),
  h('p', { class: 'gate-q' }, q, input),
  h('div', { class: 'end-buttons' },
    h('button', { class: 'btn primary', type: 'submit' }, 'Open'),
    h('button', { class: 'btn', type: 'button', onclick: () => go('home', { quiet: true }) }, 'Back to the game')));
  root.append(h('div', { class: 'screen parent-screen gate' }, form));
  setTimeout(() => input.focus(), 50);
}

// ---------------------------------------------------------------------------
let currentTab = 'lists';

export function parentHome(root, params = {}) {
  setKeyHandler(null);
  if (params.tab) currentTab = params.tab;
  const body = h('div', { class: 'parent-body' });
  const tabs = [
    ['lists', '📚 Spelling lists'],
    ['progress', '📈 Progress'],
    ['settings', '⚙️ Settings'],
  ];
  const tabBar = h('nav', { class: 'tabs', role: 'tablist' }, tabs.map(([id, label]) =>
    h('button', {
      class: 'tab' + (id === currentTab ? ' active' : ''), role: 'tab', type: 'button',
      'aria-selected': id === currentTab ? 'true' : 'false',
      onclick: () => { currentTab = id; go('parentHome'); },
    }, label)));

  root.append(h('div', { class: 'screen parent-screen' },
    h('header', { class: 'parent-top' },
      h('h1', {}, 'Grown-ups'),
      h('button', { class: 'btn primary', type: 'button', onclick: () => go('home', { quiet: true }) }, '🦄 Back to the game')),
    tabBar, body));

  if (currentTab === 'lists') listsTab(body);
  else if (currentTab === 'progress') progressTab(body);
  else return settingsTab(body);
  return undefined;
}

// ---------------------------------------------------------------------------
// Lists

function listsTab(body) {
  const custom = state.customLists;
  body.append(
    h('section', { class: 'card intro' },
      h('h2', {}, 'School spelling lists'),
      h('p', {}, 'Add the words the school sends home. Mark one list as ',
        h('b', {}, "this week's list"),
        ': those words come up in every Magic Mission until they are learnt, and they make up the Practice Test.'),
      h('button', { class: 'btn primary', type: 'button', onclick: () => go('listEditor', { id: null }) }, '＋ Add a school list')),
  );

  if (custom.length) {
    body.append(h('section', { class: 'card' },
      h('h2', {}, 'Your lists'),
      h('div', { class: 'list-cards' }, custom.slice().reverse().map((l) => listCard(l)))));
  }

  const builtIns = builtInLists();
  body.append(h('section', { class: 'card' },
    h('h2', {}, 'Year 2 curriculum lists'),
    h('p', { class: 'muted' }, 'Words from the National Curriculum spelling appendix. Switch on the ones you want mixed into Magic Missions.'),
    h('div', { class: 'builtin-list' }, builtIns.map((l) => {
      const toggle = h('input', {
        type: 'checkbox', checked: isListActive(l) ? true : undefined,
        onchange: (e) => { state.settings.builtInOn[l.id] = e.target.checked; save(); summary.textContent = activeSummary(); },
      });
      return h('div', { class: 'builtin-row' },
        h('label', { class: 'switch' }, toggle, h('span', { class: 'slider' })),
        h('details', {},
          h('summary', {}, h('b', {}, l.name), h('span', { class: 'muted' }, ` · ${l.words.length} words · ${l.about}`)),
          h('div', { class: 'word-chips' }, l.words.map((w) => markedChip(w)))),
        l.id === state.focusListId ? h('span', { class: 'pill star' }, "⭐ This week") : null,
        h('button', { class: 'btn small', type: 'button', onclick: () => setFocus(l.id) }, l.id === state.focusListId ? 'Unset' : "Use as this week's"));
    }))));

  const summary = h('p', { class: 'muted summary' }, activeSummary());
  body.append(summary);
}

function activeSummary() {
  return `Magic Missions currently choose from ${activeEntries().length} words.`;
}

function setFocus(id) {
  state.focusListId = state.focusListId === id ? null : id;
  save();
  go('parentHome');
}

function markedChip(w) {
  const tricky = new Set(trickyFor(w));
  return h('span', { class: 'chip', title: w.sentence || '' },
    [...w.text].map((c, i) => h('span', { class: tricky.has(i) ? 'tricky' : '' }, c)));
}

function listCard(l) {
  const isFocus = l.id === state.focusListId;
  const mastered = l.words.filter((w) => stageOf(state.progress[wordKey(w.text)]) === 'mastered').length;
  return h('div', { class: 'list-card' + (isFocus ? ' focus' : '') },
    h('div', { class: 'lc-head' },
      h('h3', {}, l.name),
      isFocus ? h('span', { class: 'pill star' }, "⭐ This week's list") : null,
      l.active === false ? h('span', { class: 'pill off' }, 'Switched off') : null),
    h('p', { class: 'muted' }, `${l.words.length} words · ${mastered} mastered · added ${formatDate(l.created)}`),
    h('div', { class: 'word-chips' }, l.words.map((w) => markedChip(w))),
    h('div', { class: 'lc-buttons' },
      h('button', { class: 'btn small' + (isFocus ? '' : ' primary'), type: 'button', onclick: () => setFocus(l.id) },
        isFocus ? "Unset this week's list" : "⭐ Make this week's list"),
      h('button', { class: 'btn small', type: 'button', onclick: () => go('listEditor', { id: l.id }) }, '✏️ Edit'),
      h('button', { class: 'btn small', type: 'button', onclick: () => { l.active = l.active === false; save(); go('parentHome'); } },
        l.active === false ? 'Switch on' : 'Switch off'),
      h('button', { class: 'btn small danger', type: 'button', onclick: () => deleteList(l) }, '🗑 Delete')));
}

async function deleteList(l) {
  const ok = await dialog({
    title: `Delete "${l.name}"?`,
    body: 'The list will be removed. Progress on the words is kept.',
    buttons: [{ label: 'Cancel', value: false }, { label: 'Delete', value: true, class: 'danger' }],
  });
  if (!ok) return;
  state.customLists = state.customLists.filter((x) => x.id !== l.id);
  if (state.focusListId === l.id) state.focusListId = null;
  save();
  go('parentHome');
}

function weekName() {
  const d = new Date();
  const day = (d.getDay() + 6) % 7; // Monday = 0
  d.setDate(d.getDate() - day);
  return 'Week of ' + d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

// Words we already know get their sentence and tricky bit filled in.
function knownWord(text) {
  const key = wordKey(text);
  for (const l of builtInLists()) {
    const w = l.words.find((x) => wordKey(x.text) === key);
    if (w) return w;
  }
  for (const l of state.customLists) {
    const w = l.words.find((x) => wordKey(x.text) === key && (x.sentence || (x.tricky && x.tricky.length)));
    if (w) return w;
  }
  return null;
}

// ---------------------------------------------------------------------------
// List editor

export function listEditor(root, { id }) {
  setKeyHandler(null);
  const existing = id ? state.customLists.find((l) => l.id === id) : null;
  const draft = existing
    ? JSON.parse(JSON.stringify(existing))
    : { id: newId(), name: weekName(), active: true, words: [], created: Date.now() };
  let makeFocus = existing ? state.focusListId === existing.id : true;

  const nameInput = h('input', { type: 'text', value: draft.name, maxlength: '60', class: 'text-input', 'aria-label': 'List name' });
  const addArea = h('textarea', {
    rows: '4', class: 'text-input',
    placeholder: 'Type or paste the words, one per line or separated by commas.\ne.g. because, people, water, again',
    autocapitalize: 'off', autocomplete: 'off', spellcheck: 'false',
  });
  const msg = h('p', { class: 'form-msg', 'aria-live': 'polite' });
  const rows = h('div', { class: 'word-rows' });
  const count = h('span', { class: 'muted' });

  const addWords = () => {
    const { good, bad } = parseWordInput(addArea.value);
    const have = new Set(draft.words.map((w) => wordKey(w.text)));
    let added = 0;
    for (const t of good) {
      if (have.has(wordKey(t))) continue;
      const known = knownWord(t);
      draft.words.push({
        text: t,
        tricky: known && cleanWord(known.text) === t ? (known.tricky || []).slice() : [],
        sentence: known ? known.sentence || '' : '',
      });
      have.add(wordKey(t));
      added++;
    }
    addArea.value = bad.join(', ');
    msg.textContent = bad.length
      ? `Couldn't add: ${bad.join(', ')} (use letters, apostrophes or hyphens only).`
      : added ? `Added ${added} word${added === 1 ? '' : 's'}.` : '';
    msg.classList.toggle('error', bad.length > 0);
    drawRows();
  };

  function drawRows() {
    clear(rows);
    count.textContent = `${draft.words.length} word${draft.words.length === 1 ? '' : 's'}`;
    if (!draft.words.length) {
      rows.append(h('p', { class: 'muted empty' }, 'No words yet. Add some above.'));
      return;
    }
    draft.words.forEach((w, wi) => {
      const marked = new Set(w.tricky || []);
      const guess = !marked.size ? new Set(trickyFor(w)) : null;
      const letters = h('div', { class: 'letter-pick', title: 'Tap letters to mark the tricky part' },
        [...w.text].map((c, i) => {
          if (c === ' ') return h('span', { class: 'lp-gap' });
          return h('button', {
            type: 'button',
            class: 'lp' + (marked.has(i) ? ' on' : guess && guess.has(i) ? ' guess' : ''),
            onclick: () => {
              const set = new Set(w.tricky || []);
              if (set.has(i)) set.delete(i); else set.add(i);
              w.tricky = [...set].sort((a, b) => a - b);
              drawRows();
            },
          }, c);
        }));
      const sentence = h('input', {
        type: 'text', class: 'text-input sentence-input', value: w.sentence || '', maxlength: '140',
        placeholder: `Optional sentence, e.g. "I can spell ${w.text}."`,
        oninput: (e) => { w.sentence = e.target.value; warn.textContent = sentenceWarning(w); },
      });
      const warn = h('div', { class: 'sentence-warn' }, sentenceWarning(w));
      rows.append(h('div', { class: 'word-row' },
        h('div', { class: 'wr-word' }, letters),
        h('div', { class: 'wr-sentence' }, sentence, warn),
        h('div', { class: 'wr-buttons' },
          h('button', { type: 'button', class: 'btn small', title: 'Listen', onclick: () => sayWord({ text: w.text, sentence: w.sentence }) }, '🔊'),
          h('button', {
            type: 'button', class: 'btn small danger', title: 'Remove',
            onclick: () => { draft.words.splice(wi, 1); drawRows(); },
          }, '✕'))));
    });
  }

  const focusBox = h('input', { type: 'checkbox', checked: makeFocus ? true : undefined, onchange: (e) => { makeFocus = e.target.checked; } });

  const saveList = () => {
    if (addArea.value.trim()) addWords();
    if (addArea.value.trim()) return; // there were invalid words; let the grown-up fix them
    draft.name = nameInput.value.trim() || weekName();
    if (!draft.words.length) {
      msg.textContent = 'Please add at least one word.';
      msg.classList.add('error');
      shake(msg);
      return;
    }
    draft.words.forEach((w) => { w.sentence = (w.sentence || '').trim(); });
    const i = state.customLists.findIndex((l) => l.id === draft.id);
    if (i >= 0) state.customLists[i] = draft;
    else state.customLists.push(draft);
    if (makeFocus) state.focusListId = draft.id;
    else if (state.focusListId === draft.id) state.focusListId = null;
    saveNow();
    voice.prefetch(entryPhrases(draft.words), makeFocus ? 'soon' : 'later');
    currentTab = 'lists';
    go('parentHome');
  };

  root.append(h('div', { class: 'screen parent-screen' },
    h('header', { class: 'parent-top' },
      h('h1', {}, existing ? 'Edit list' : 'New school list'),
      h('button', { class: 'btn', type: 'button', onclick: () => go('parentHome') }, 'Cancel')),
    h('div', { class: 'parent-body' },
      h('section', { class: 'card' },
        h('label', { class: 'field' }, h('span', {}, 'List name'), nameInput),
        h('label', { class: 'field' }, h('span', {}, 'Add words'), addArea),
        h('div', { class: 'row-buttons' },
          h('button', { class: 'btn', type: 'button', onclick: addWords }, '＋ Add these words')),
        msg),
      h('section', { class: 'card' },
        h('div', { class: 'card-head' }, h('h2', {}, 'Words'), count),
        h('p', { class: 'muted' },
          'Tap letters to mark the ', h('span', { class: 'tricky-sample' }, 'tricky part'),
          '. It is highlighted when the word is introduced and left blank in the "missing letters" game. ',
          'If you don\'t mark anything we guess (shown in ', h('span', { class: 'guess-sample' }, 'dotted'), '). ',
          'A sentence is optional, but it helps a lot with sound-alike words like there/their.'),
        rows),
      h('section', { class: 'card' },
        h('label', { class: 'check-field' }, focusBox, h('span', {}, "⭐ This is this week's list (used for the Practice Test)")),
        h('div', { class: 'row-buttons' },
          h('button', { class: 'btn primary', type: 'button', onclick: saveList }, '💾 Save list'),
          h('button', { class: 'btn', type: 'button', onclick: () => go('parentHome') }, 'Cancel'))))));

  addArea.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); addWords(); }
  });
  drawRows();
  if (!existing) setTimeout(() => addArea.focus(), 50);
}

function sentenceWarning(w) {
  const s = (w.sentence || '').trim();
  if (!s) return '';
  return sentenceHasWord(s, w.text) ? '' : `Tip: include the word "${w.text}" in the sentence.`;
}

// ---------------------------------------------------------------------------
// Progress

function stagePill(prog) {
  const st = stageOf(prog);
  return h('span', { class: 'pill stage-' + st }, STAGE_LABEL[st]);
}

function progressTab(body) {
  const weekAgo = Date.now() - 7 * 24 * 3600 * 1000;
  const recent = state.sessions.filter((s) => s.date >= weekAgo);
  const entries = activeEntries();
  const allKeys = Object.keys(state.progress);
  const mastered = allKeys.filter((k) => stageOf(state.progress[k]) === 'mastered').length;
  const practised = allKeys.filter((k) => state.progress[k].seen > 0).length;

  body.append(h('section', { class: 'stats' },
    stat('⭐', state.stars, 'stars'),
    stat('🦄', `${state.unicorns.length}/${UNICORNS.length}`, 'unicorns'),
    stat('🏅', mastered, 'words mastered'),
    stat('📖', practised, 'words practised'),
    stat('🌈', recent.filter((s) => s.kind === 'mission').length, 'missions this week'),
    stat('📝', recent.filter((s) => s.kind === 'test').length, 'tests this week')));

  const focus = state.focusListId ? findList(state.focusListId) : null;
  if (focus) {
    body.append(h('section', { class: 'card' },
      h('h2', {}, `⭐ This week: ${focus.name}`),
      wordTable(focus.words.map((w) => ({ text: w.text, key: wordKey(w.text) })))));
  }

  const tests = state.tests.slice(-5).reverse();
  body.append(h('section', { class: 'card' },
    h('h2', {}, 'Recent practice tests'),
    tests.length
      ? h('table', { class: 'table' },
        h('thead', {}, h('tr', {}, h('th', {}, 'Date'), h('th', {}, 'List'), h('th', {}, 'Score'), h('th', {}, 'Spelt differently'))),
        h('tbody', {}, tests.map((t) => {
          const right = t.results.filter((r) => r.right).length;
          const wrong = t.results.filter((r) => !r.right);
          return h('tr', {},
            h('td', {}, formatDate(t.date)),
            h('td', {}, t.listName),
            h('td', {}, `${right} / ${t.results.length}`),
            h('td', {}, wrong.length ? wrong.map((r) => h('span', { class: 'miss-pair' }, h('s', {}, r.attempt), ' → ', h('b', {}, r.word))) : '🎉 All right!'));
        })))
      : h('p', { class: 'muted' }, "No tests yet. Tests use this week's list.")));

  const tricky = allKeys
    .map((k) => ({ key: k, p: state.progress[k] }))
    .filter((x) => x.p.wrong > 0)
    .sort((a, b) => b.p.wrong - b.p.right * 0.5 - (a.p.wrong - a.p.right * 0.5))
    .slice(0, 12);
  body.append(h('section', { class: 'card' },
    h('h2', {}, 'Trickiest words'),
    tricky.length
      ? wordTable(tricky.map((x) => ({ text: displayText(x.key), key: x.key })))
      : h('p', { class: 'muted' }, 'Nothing tricky yet!')));

  const seenActive = entries.filter((e) => state.progress[e.key] && state.progress[e.key].seen);
  body.append(h('section', { class: 'card' },
    h('details', {},
      h('summary', {}, h('b', {}, `All practised words (${seenActive.length})`)),
      wordTable(seenActive.map((e) => ({ text: e.text, key: e.key }))))));

  body.append(h('p', { class: 'muted' },
    'How it works: new words are looked at, then filled in, then built from letter tiles, then spelt from listening. ',
    'Once a word is spelt right first time it comes back after 1, 3 and 7 days. After that it counts as mastered.'));
}

function displayText(key) {
  for (const l of allLists()) {
    const w = l.words.find((x) => wordKey(x.text) === key);
    if (w) return cleanWord(w.text);
  }
  return key;
}

function stat(icon, value, label) {
  return h('div', { class: 'stat' }, h('div', { class: 'stat-icon' }, icon), h('div', { class: 'stat-value' }, String(value)), h('div', { class: 'stat-label' }, label));
}

function wordTable(words) {
  if (!words.length) return h('p', { class: 'muted' }, 'No words.');
  return h('table', { class: 'table' },
    h('thead', {}, h('tr', {}, h('th', {}, 'Word'), h('th', {}, 'Stage'), h('th', {}, 'Right first time'), h('th', {}, 'Needed help'), h('th', {}, 'Last mistake'), h('th', {}, 'Last practised'))),
    h('tbody', {}, words.map((w) => {
      const p = state.progress[w.key] || blankProgress();
      return h('tr', {},
        h('td', {}, h('b', {}, w.text)),
        h('td', {}, stagePill(state.progress[w.key])),
        h('td', {}, String(p.right || 0)),
        h('td', {}, String(p.wrong || 0)),
        h('td', {}, p.lastWrong ? h('s', {}, p.lastWrong) : '–'),
        h('td', {}, formatDate(p.lastSeen)));
    })));
}

// ---------------------------------------------------------------------------
// Settings

function settingsTab(body) {
  const s = state.settings;
  const set = (k, v) => { s[k] = v; save(); };

  const name = h('input', { type: 'text', class: 'text-input', value: s.childName, maxlength: '20', oninput: (e) => set('childName', e.target.value.trim()) });

  const perMission = h('select', { class: 'text-input', onchange: (e) => set('wordsPerMission', Number(e.target.value)) },
    [5, 6, 8, 10, 12].map((n) => h('option', { value: n, selected: s.wordsPerMission === n ? true : undefined }, `${n} words`)));

  const voiceArea = h('div', {});
  const stopListening = voiceCard(voiceArea, s, set);
  const check = (key, label, after) => h('label', { class: 'check-field' },
    h('input', { type: 'checkbox', checked: s[key] ? true : undefined, onchange: (e) => { set(key, e.target.checked); if (after) after(); } }),
    h('span', {}, label));

  const layout = h('div', { class: 'radio-row' }, [['qwerty', 'Like the Chromebook keyboard (qwerty)'], ['abc', 'Alphabetical (abc)']].map(([v, label]) =>
    h('label', { class: 'check-field' },
      h('input', { type: 'radio', name: 'layout', value: v, checked: s.keyboardLayout === v ? true : undefined, onchange: () => set('keyboardLayout', v) }),
      h('span', {}, label))));

  const fileInput = h('input', { type: 'file', accept: 'application/json,.json', class: 'hidden-file', onchange: (e) => restore(e.target.files[0]) });

  body.append(
    h('section', { class: 'card' },
      h('h2', {}, 'Player'),
      h('label', { class: 'field' }, h('span', {}, "Child's first name (used in greetings)"), name),
      h('label', { class: 'field' }, h('span', {}, 'Words in each Magic Mission'), perMission)),
    h('section', { class: 'card' }, h('h2', {}, 'Voice'), voiceArea),
    h('section', { class: 'card' },
      h('h2', {}, 'Game'),
      check('showKeyboard', 'Show the on-screen keyboard (handy for touchscreens; the Chromebook keys always work)'),
      h('p', { class: 'muted' }, 'On-screen keyboard layout:'),
      layout,
      check('sounds', 'Sound effects'),
      check('calm', 'Calm colours (cream background, fewer sparkles; can help some readers)', () => document.body.classList.toggle('calm', s.calm))),
    h('section', { class: 'card' },
      h('h2', {}, 'Backup'),
      h('p', { class: 'muted' }, 'Progress is saved on this Chromebook only. Download a backup now and then, especially before clearing browsing data.'),
      h('div', { class: 'row-buttons' },
        h('button', { class: 'btn', type: 'button', onclick: backup }, '⬇️ Download backup'),
        h('button', { class: 'btn', type: 'button', onclick: () => fileInput.click() }, '⬆️ Restore from backup'),
        fileInput)),
    h('section', { class: 'card danger-zone' },
      h('h2', {}, 'Start again'),
      h('div', { class: 'row-buttons' },
        h('button', { class: 'btn danger', type: 'button', onclick: resetProgress }, 'Reset progress (keep lists and settings)'),
        h('button', { class: 'btn danger', type: 'button', onclick: resetAll }, 'Delete everything'))),
    h('p', { class: 'muted' }, 'Unicorn Spelling · words from the National Curriculum in England (Year 2) · no accounts, no adverts, nothing leaves this device.'));
  return stopListening;
}

// Voice settings: natural (Piper) voice or the Chromebook's own voices.
function voiceCard(area, s, set) {
  const unsubs = [];
  const draw = () => {
    unsubs.splice(0).forEach((fn) => fn());
    clear(area);
    const natural = s.voiceEngine === 'piper';
    const engine = (value, title, note) => h('label', { class: 'engine-option' + (s.voiceEngine === value ? ' on' : '') },
      h('input', {
        type: 'radio', name: 'engine', value, checked: s.voiceEngine === value ? true : undefined,
        onchange: () => { set('voiceEngine', value); voice.settingsChanged(); draw(); },
      }),
      h('span', {}, h('b', {}, title), h('br'), h('span', { class: 'muted' }, note)));

    area.append(h('div', { class: 'engine-options' },
      engine('piper', 'Natural voice (recommended)', 'Made on this Chromebook. Downloads once (about 63 MB), then works offline. Nothing is sent anywhere.'),
      engine('browser', 'Chromebook voice', "Uses the voices built into Chrome. No download, but they sound more robotic.")));

    if (natural) {
      const sel = h('select', { class: 'text-input', onchange: (e) => { set('piperVoice', e.target.value); voice.settingsChanged(); } },
        voice.PIPER_VOICES.map((v) => h('option', { value: v.id, selected: s.piperVoice === v.id ? true : undefined }, `${v.name} – ${v.about}`)));
      const statusLine = h('div', { class: 'voice-status' });
      const updateStatus = () => drawStatus(statusLine);
      unsubs.push(voice.onVoiceStatus(updateStatus));
      updateStatus();
      area.append(h('label', { class: 'field' }, h('span', {}, 'Natural voice'), sel), statusLine,
        h('p', { class: 'muted credit' }, 'Natural voices by the Piper project. Cori is the voice of Cori Samuel, a LibriVox volunteer reader (Hi-Fi TTS dataset, CC BY 4.0).'));
    } else {
      const sel = h('select', { class: 'text-input', onchange: (e) => set('voiceURI', e.target.value) });
      const note = h('p', { class: 'muted' });
      const fill = () => {
        clear(sel);
        const vs = englishVoices();
        const cur = chosenVoice();
        sel.append(h('option', { value: '' }, 'Automatic (British English if available)'));
        for (const v of vs) sel.append(h('option', { value: v.voiceURI, selected: s.voiceURI === v.voiceURI ? true : undefined }, `${v.name} (${v.lang})`));
        note.textContent = !speechAvailable()
          ? 'This browser cannot speak. Please use Google Chrome.'
          : !vs.length
            ? 'No English voices found yet. On a Chromebook they appear after a moment, or when the Chromebook is online.'
            : cur ? `Using: ${cur.name}` : '';
      };
      setTimeout(fill, 0);
      if (window.speechSynthesis && window.speechSynthesis.addEventListener) {
        window.speechSynthesis.addEventListener('voiceschanged', fill);
        unsubs.push(() => window.speechSynthesis.removeEventListener('voiceschanged', fill));
      }
      area.append(h('label', { class: 'field' }, h('span', {}, 'Chromebook voice'), sel), note);
    }

    const rateLabel = () => (s.rate < 0.8 ? 'Slow' : s.rate < 0.95 ? 'Steady' : 'Normal');
    const rateOut = h('span', { class: 'muted' }, rateLabel());
    const rate = h('input', {
      type: 'range', min: '0.6', max: '1.1', step: '0.05', value: String(s.rate),
      oninput: (e) => { set('rate', Number(e.target.value)); rateOut.textContent = rateLabel(); },
      onchange: () => voice.prefetch(commonPhrases(), 'later'),
    });
    area.append(
      h('label', { class: 'field' }, h('span', {}, 'Speaking speed'), h('div', { class: 'range-row' }, rate, rateOut)),
      h('div', { class: 'row-buttons' },
        h('button', { class: 'btn', type: 'button', onclick: () => say('Hello!', 'Can you spell, beautiful?', 'The rainbow looked beautiful.') }, '🔊 Test the voice'),
        natural ? h('button', { class: 'btn small', type: 'button', onclick: removeVoices }, 'Remove downloaded voices') : null));
  };

  async function removeVoices() {
    const ok = await dialog({
      title: 'Remove downloaded voices?',
      body: 'This frees up space. The voice downloads again the next time it is needed.',
      buttons: [{ label: 'Cancel', value: false }, { label: 'Remove', value: true, class: 'danger' }],
    });
    if (!ok) return;
    await voice.removeDownloads();
    if (s.voiceEngine === 'piper') voice.ensureLoaded();
  }

  draw();
  return () => unsubs.forEach((fn) => fn());
}

function drawStatus(el) {
  clear(el);
  const st = voice.voiceStatus;
  const name = voice.voiceById(state.settings.piperVoice).name;
  if (st.status === 'unsupported') {
    el.append(h('p', { class: 'form-msg error' }, 'This browser cannot run the natural voice. The Chromebook voice will be used.'));
  } else if (st.status === 'ready') {
    el.append(h('p', { class: 'form-msg' }, `✅ ${name} is ready.`));
  } else if (st.status === 'downloading') {
    const pct = Math.round((st.progress || 0) * 100);
    el.append(
      h('p', { class: 'muted' }, `⬇️ Downloading ${name}… ${pct}%  (the Chromebook voice is used until it's ready)`),
      h('div', { class: 'meter-bar' }, h('div', { class: 'meter-fill', style: { width: pct + '%' } })));
  } else if (st.status === 'starting') {
    el.append(h('p', { class: 'muted' }, `⏳ Getting ${name} ready…`));
  } else if (st.status === 'error') {
    el.append(h('p', { class: 'form-msg error' }, `⚠️ ${st.error}`),
      h('button', { class: 'btn small', type: 'button', onclick: () => voice.settingsChanged() }, 'Try again'));
  } else {
    el.append(h('p', { class: 'muted' }, 'Not downloaded yet.'),
      h('button', { class: 'btn small primary', type: 'button', onclick: () => voice.ensureLoaded() }, '⬇️ Download now'));
  }
}

function backup() {
  saveNow();
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const a = h('a', { href: URL.createObjectURL(blob), download: `unicorn-spelling-backup-${new Date().toISOString().slice(0, 10)}.json` });
  document.body.append(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
}

function restore(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = async () => {
    try {
      const data = JSON.parse(reader.result);
      if (!data || typeof data !== 'object' || !data.settings || !data.progress) throw new Error('not a backup');
      const ok = await dialog({
        title: 'Restore this backup?',
        body: `It has ${Object.keys(data.progress).length} practised words and ${data.stars || 0} stars. This replaces what is on this Chromebook now.`,
        buttons: [{ label: 'Cancel', value: false }, { label: 'Restore', value: true, class: 'primary' }],
      });
      if (!ok) return;
      replaceState(data);
      document.body.classList.toggle('calm', !!state.settings.calm);
      go('parentHome');
    } catch {
      dialog({ title: 'That file did not work', body: 'Please choose a backup file downloaded from Unicorn Spelling.', buttons: [{ label: 'OK', value: true }] });
    }
  };
  reader.readAsText(file);
}

async function resetProgress() {
  const ok = await dialog({
    title: 'Reset progress?',
    body: 'Stars, unicorns, test results and word progress will be cleared. Lists and settings stay.',
    buttons: [{ label: 'Cancel', value: false }, { label: 'Reset progress', value: true, class: 'danger' }],
  });
  if (!ok) return;
  const d = defaultState();
  replaceState({ ...d, settings: state.settings, customLists: state.customLists, focusListId: state.focusListId });
  go('parentHome');
}

async function resetAll() {
  const ok = await dialog({
    title: 'Delete everything?',
    body: 'All lists, progress and settings will be deleted from this Chromebook.',
    buttons: [{ label: 'Cancel', value: false }, { label: 'Delete everything', value: true, class: 'danger' }],
  });
  if (!ok) return;
  resetState();
  document.body.classList.remove('calm');
  go('parentHome');
}

