// Decides which words to practise and how each word moves up the "ladder".
//
// Level  Activity                     When it comes back
//   0    Look, cover, write           same mission / next mission
//   1    Missing letters              next mission
//   2    Letter tiles                 next mission
//   3    Spell it (from listening)    next mission
//   4    Spell it                     1 day later
//   5    Spell it                     3 days later
//   6    Spell it                     7 days later
//   7    Mastered!                    21 days later (then 30)
//
// Words on "this week's list" come back at least every day until mastered.

export const MAX_LEVEL = 7;
const DAY = 24 * 60 * 60 * 1000;
const INTERVAL_DAYS = [0, 0, 0, 0, 1, 3, 7, 21];

export function activityFor(level) {
  if (level <= 0) return 'look';
  if (level === 1) return 'missing';
  if (level === 2) return 'tiles';
  return 'spell';
}

export function startOfDay(t) {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

export function dueAfter(level, now, { focus = false, wasMastered = false } = {}) {
  let days = INTERVAL_DAYS[Math.max(0, Math.min(MAX_LEVEL, level))];
  if (level >= MAX_LEVEL && wasMastered) days = 30;
  if (focus) days = Math.min(days, level >= MAX_LEVEL ? 3 : 1);
  if (days === 0) return now;
  return startOfDay(now) + days * DAY;
}

export function blankProgress() {
  return { level: 0, due: 0, seen: 0, right: 0, wrong: 0, lastSeen: 0, lastWrong: '', firstSeen: 0 };
}

// outcome: 'first' (right first time), 'second' (right on 2nd go),
//          'fail' (needed to copy it), for tests: 'right' / 'wrong'
export function applyOutcome(prev, activity, outcome, now, { focus = false, attempt = '' } = {}) {
  const p = { ...blankProgress(), ...(prev || {}) };
  const before = p.level;
  let level = before;
  // Practising a word before it is due again is fine, but it doesn't move the
  // word further along: spacing the practice out is what makes it stick.
  const early = !!prev && prev.seen > 0 && before >= 4 && prev.due > now;

  switch (activity) {
    case 'look':
      level = outcome === 'fail' ? 0 : 1;
      break;
    case 'missing':
      level = outcome === 'first' ? 2 : outcome === 'second' ? 1 : 0;
      break;
    case 'tiles':
      level = outcome === 'first' ? 3 : outcome === 'second' ? 2 : 1;
      break;
    case 'spell':
      if (outcome === 'first') level = Math.min(MAX_LEVEL, Math.max(before, 3) + 1);
      else if (outcome === 'second') level = Math.max(3, Math.min(before, MAX_LEVEL) - 1);
      else level = 2;
      break;
    case 'test':
      if (outcome === 'right') level = Math.min(MAX_LEVEL, Math.max(before + 1, 4));
      else level = Math.min(before, 2);
      break;
    default:
      break;
  }

  if (early && level >= before) {
    level = before;
    p.due = prev.due;
  } else {
    p.due = dueAfter(level, now, { focus, wasMastered: before >= MAX_LEVEL });
  }
  p.level = level;
  p.seen += 1;
  if (!p.firstSeen) p.firstSeen = now;
  p.lastSeen = now;
  const good = outcome === 'first' || outcome === 'right';
  if (good) p.right += 1;
  else p.wrong += 1;
  if (!good && attempt) p.lastWrong = attempt;
  return p;
}

export function stageOf(prog) {
  if (!prog || !prog.seen) return 'new';
  if (prog.level >= MAX_LEVEL) return 'mastered';
  if (prog.level >= 3) return 'practising';
  return 'learning';
}

export const STAGE_LABEL = {
  new: 'Not started',
  learning: 'Learning',
  practising: 'Practising',
  mastered: 'Mastered',
};

// ---------------------------------------------------------------------------
// Pick the words for one mission.
// entries: [{ key, text, tricky, sentence, listId, focus }] (already de-duplicated)
export function pickMissionWords(entries, progress, now, count, rng = Math.random) {
  const maxNew = Math.max(1, Math.ceil(count / 2));
  const picked = [];
  const used = new Set();
  let newCount = 0;

  const add = (e, isNew = false) => {
    if (picked.length >= count || used.has(e.key)) return;
    if (isNew) {
      if (newCount >= maxNew) return;
      newCount++;
    }
    used.add(e.key);
    picked.push(e);
  };

  const info = entries.map((e) => ({ e, p: progress[e.key] }));
  const isNew = (x) => !x.p || !x.p.seen;
  const learning = (x) => !isNew(x) && x.p.level <= 3;
  const dueReview = (x) => !isNew(x) && x.p.level > 3 && x.p.due <= now;

  const byOverdue = (a, b) => a.p.due - b.p.due;
  const byLastSeen = (a, b) => a.p.lastSeen - b.p.lastSeen;

  for (const focusPass of [true, false]) {
    const group = info.filter((x) => !!x.e.focus === focusPass);
    group.filter(learning).sort(byLastSeen).forEach((x) => add(x.e));
    group.filter(dueReview).sort(byOverdue).forEach((x) => add(x.e));
    group.filter(isNew).forEach((x) => add(x.e, true));
  }

  // Still room? Revise words that are not due yet, oldest first.
  if (picked.length < count) {
    info
      .filter((x) => !isNew(x) && !used.has(x.e.key))
      .sort((a, b) => (b.e.focus ? 1 : 0) - (a.e.focus ? 1 : 0) || byLastSeen(a, b))
      .forEach((x) => add(x.e));
  }
  // Still room (very first missions with tiny lists)? allow extra new words.
  if (picked.length < count) {
    info.filter((x) => isNew(x)).forEach((x) => { if (picked.length < count && !used.has(x.e.key)) { used.add(x.e.key); picked.push(x.e); } });
  }

  // Mix the order so new words are spread out.
  return shuffleArr(picked, rng);
}

function shuffleArr(arr, rng) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Should a word get a second go later in the same mission?
export function shouldRepeat(levelAfter, roundsSoFar) {
  return levelAfter <= 3 && roundsSoFar < 2;
}

// Stars for one word.
export function starsFor(outcome) {
  if (outcome === 'first' || outcome === 'right') return 2;
  return 1;
}
