// Pure helpers for words: parsing, comparing attempts, hints.
// No DOM access here so these can be unit-tested with Node.

// Turn 'bec[au]se' into { text: 'because', tricky: [3, 4] }
export function parseMarked(marked) {
  let text = '';
  const tricky = [];
  let inside = false;
  for (const ch of marked) {
    if (ch === '[') { inside = true; continue; }
    if (ch === ']') { inside = false; continue; }
    if (inside) tricky.push(text.length);
    text += ch;
  }
  return { text, tricky };
}

// Turn { text, tricky } back into 'bec[au]se' (used for display / export)
export function toMarked(text, tricky = []) {
  const set = new Set(tricky);
  let out = '';
  let inside = false;
  for (let i = 0; i < text.length; i++) {
    const t = set.has(i);
    if (t && !inside) { out += '['; inside = true; }
    if (!t && inside) { out += ']'; inside = false; }
    out += text[i];
  }
  if (inside) out += ']';
  return out;
}

export function cleanWord(raw) {
  return String(raw || '')
    .replace(/[\u2018\u2019\u02BC`´]/g, "'")
    .replace(/[\u2010-\u2014]/g, '-')
    .replace(/\s+/g, ' ')
    .trim();
}

export function wordKey(text) {
  return cleanWord(text).toLowerCase();
}

export const VALID_WORD = /^[A-Za-z]+(?:['\- ][A-Za-z]+)*'?$/;

export function isValidWord(text) {
  const t = cleanWord(text);
  return t.length >= 1 && t.length <= 24 && VALID_WORD.test(t);
}

// Letters the child has to type (everything except spaces is typed).
export function isTypeable(ch) {
  return /[a-z'\-]/i.test(ch);
}

export function sameLetter(a, b) {
  return String(a).toLowerCase() === String(b).toLowerCase();
}

export function sameWord(a, b) {
  return wordKey(a) === wordKey(b);
}

// ---------------------------------------------------------------------------
// Guess the tricky bit of a word when a parent hasn't marked one.
// Looks for well-known spelling patterns, most "tricky" first.
const PATTERNS = [
  'tion', 'sion', 'ough', 'augh', 'eigh', 'dge', 'igh', 'tch', 'ture', 'ous',
  'air', 'ear', 'ure', 'are', 'our', 'eau', 'ould',
  'kn', 'gn', 'wr', 'mb', 'ph', 'wh',
  'ey', 'ay', 'ai', 'ee', 'ea', 'oa', 'oo', 'ou', 'ow', 'oy', 'oi',
  'ar', 'or', 'er', 'ir', 'ur', 'aw', 'au', 'ew', 'ue', 'ie', 'oe',
  'le', 'el', 'al', 'il', 'ck', 'ss', 'll', 'ff', 'zz',
];

export function autoTricky(text) {
  const lower = text.toLowerCase();
  const n = lower.length;
  if (n <= 1) return [0];

  // apostrophe in a short form: can't -> the apostrophe
  const apos = lower.indexOf("'");
  if (apos >= 0) return [apos];

  // split vowel digraph: make, smile, home (vowel + consonant + final e)
  const splitE = /([aeiou])([b-df-hj-np-tv-z])e$/.exec(lower);
  const splitAt = splitE ? splitE.index : -1;

  for (const p of PATTERNS) {
    // skip the very first letter only for 1-letter patterns (handled below)
    const at = lower.indexOf(p);
    if (at >= 0) {
      if (splitAt >= 0 && p.length <= 2 && splitAt <= at) break; // prefer split digraph
      if (p.length >= n) break; // pattern is the whole word: fall through
      return range(at, p.length);
    }
  }
  if (splitAt >= 0) return [splitAt, n - 1];

  // fall back to the first vowel that isn't the first letter
  for (let i = 1; i < n; i++) {
    if ('aeiouy'.includes(lower[i])) return [i];
  }
  return [Math.min(1, n - 1)];
}

function range(start, len) {
  return Array.from({ length: len }, (_, i) => start + i);
}

// Tricky indices to use for a word (marked ones, else a guess), and never
// so many that "missing letters" becomes the whole word.
export function trickyFor(entry) {
  const text = entry.text;
  let idx = (entry.tricky && entry.tricky.length ? entry.tricky : autoTricky(text))
    .filter((i) => i >= 0 && i < text.length && text[i] !== ' ');
  const max = Math.max(1, Math.ceil(text.replace(/ /g, '').length * 0.6));
  if (idx.length > max) idx = idx.slice(0, max);
  return idx;
}

// ---------------------------------------------------------------------------
// Compare what the child typed with the right spelling.
// Returns per-letter marks for both strings and how many letters matched.
export function compareSpelling(target, attempt) {
  const T = [...target];
  const A = [...attempt];
  const n = T.length;
  const m = A.length;
  // edit distance table
  const d = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0));
  for (let i = 0; i <= n; i++) d[i][0] = i;
  for (let j = 0; j <= m; j++) d[0][j] = j;
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const cost = sameLetter(T[i - 1], A[j - 1]) ? 0 : 1;
      d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + cost);
    }
  }
  const targetMarks = new Array(n).fill('miss');
  const attemptMarks = new Array(m).fill('bad');
  let i = n;
  let j = m;
  let matches = 0;
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0) {
      const same = sameLetter(T[i - 1], A[j - 1]);
      if (d[i][j] === d[i - 1][j - 1] + (same ? 0 : 1)) {
        if (same) {
          targetMarks[i - 1] = 'ok';
          attemptMarks[j - 1] = 'ok';
          matches++;
        }
        i--; j--;
        continue;
      }
    }
    if (i > 0 && d[i][j] === d[i - 1][j] + 1) { i--; continue; }
    j--;
  }
  return {
    correct: wordKey(target) === wordKey(attempt),
    targetMarks,
    attemptMarks,
    matches,
    distance: d[n][m],
  };
}

// ---------------------------------------------------------------------------
// Replace the word inside its sentence with a gap: "I wore my coat _____ it was cold."
export function blankSentence(sentence, word) {
  if (!sentence) return '';
  const esc = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/'/g, "['\u2019]");
  const re = new RegExp(`(^|[^A-Za-z'])(${esc})(?![A-Za-z])`, 'gi');
  return sentence.replace(re, (_, pre) => `${pre}\u2009_____\u2009`);
}

export function sentenceHasWord(sentence, word) {
  return blankSentence(sentence, word) !== sentence;
}

// ---------------------------------------------------------------------------
// Letter tiles: the letters of the word plus a couple of "decoy" letters
// that are easy to mix up with the real ones.
const CONFUSABLE = {
  a: 'eou', e: 'aiu', i: 'eyu', o: 'aue', u: 'oea', y: 'ie',
  b: 'dp', d: 'bp', p: 'bq', q: 'pg', m: 'nw', n: 'mu', c: 'ks', k: 'cg', s: 'cz', z: 's',
  f: 'v', v: 'fw', g: 'jq', j: 'g', w: 'vu', l: 'i', r: 'w', t: 'd', h: 'n', x: 'ks',
};

export function decoyLetters(text, count, rng = Math.random) {
  const letters = [...text.toLowerCase()].filter((c) => /[a-z]/.test(c));
  const out = [];
  const pool = [];
  for (const c of letters) for (const d of CONFUSABLE[c] || '') pool.push(d);
  const fallback = 'aeiouslrtn';
  let guard = 0;
  while (out.length < count && guard++ < 50) {
    const src = pool.length ? pool : [...fallback];
    const pick = src[Math.floor(rng() * src.length)];
    if (!out.includes(pick)) out.push(pick);
  }
  return out;
}

export function shuffle(arr, rng = Math.random) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Shuffle tiles but avoid handing over the answer in order.
export function scrambleTiles(chars, rng = Math.random) {
  if (chars.length < 2) return chars.slice();
  let out = chars;
  for (let k = 0; k < 10; k++) {
    out = shuffle(chars, rng);
    if (out.join('') !== chars.join('')) break;
  }
  return out;
}

// Parse a pasted/typed word list: commas, new lines, semicolons, tabs.
// Numbering like "1. because" or "1) because" is removed.
export function parseWordInput(raw) {
  const parts = String(raw || '')
    .split(/[\n,;\t]+/)
    .map((p) => cleanWord(p.replace(/^\s*\d+\s*[.)\-:]?\s*/, '')))
    .filter(Boolean);
  const good = [];
  const bad = [];
  const seen = new Set();
  for (const p of parts) {
    if (!isValidWord(p)) { bad.push(p); continue; }
    const k = wordKey(p);
    if (seen.has(k)) continue;
    seen.add(k);
    good.push(p);
  }
  return { good, bad };
}
