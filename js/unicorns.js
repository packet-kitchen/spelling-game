// Unicorn collection + SVG drawing.
// Every unicorn is drawn from the same template with its own colours and
// accessory, so adding a new one is just another line in UNICORNS.

const INK = '#4a3366';

export const UNICORNS = [
  { id: 'sparkle', name: 'Sparkle', body: '#ffffff', mane: ['#ff7eb9', '#b48cff', '#7ec8ff'], horn: '#ffd166', hoof: '#c9a7ff', acc: 'none' },
  { id: 'bluebell', name: 'Bluebell', body: '#e3f1ff', mane: ['#5aa9ff', '#8fd3ff', '#b6a4ff'], horn: '#ffd166', hoof: '#7aa7e8', acc: 'flower', accColor: '#7f8cff' },
  { id: 'cupcake', name: 'Cupcake', body: '#ffe3ef', mane: ['#ff6fa8', '#ffb3d1', '#ffffff'], horn: '#ffe08a', hoof: '#ff8fbf', acc: 'bow', accColor: '#ff4f9a' },
  { id: 'moonbeam', name: 'Moonbeam', body: '#ece6ff', mane: ['#6c5ce7', '#a29bfe', '#dfe6ff'], horn: '#fff3b0', hoof: '#8e7cf0', acc: 'star', accColor: '#ffd84d' },
  { id: 'pudding', name: 'Pudding', body: '#fff1d6', mane: ['#d9965b', '#f2c48d', '#fff0c9'], horn: '#ffd166', hoof: '#c58a55', acc: 'heart', accColor: '#ff6f91' },
  { id: 'snowdrop', name: 'Snowdrop', body: '#f7fbff', mane: ['#bfe6ff', '#e6f6ff', '#c9d6ff'], horn: '#cfe8ff', hoof: '#a9c6e8', acc: 'flower', accColor: '#ffffff' },
  { id: 'twinkle', name: 'Twinkle', body: '#fff8c9', mane: ['#ffb703', '#ffd166', '#ff9f68'], horn: '#ffffff', hoof: '#f4a261', acc: 'star', accColor: '#ff9f1c' },
  { id: 'blossom', name: 'Blossom', body: '#ffeaf3', mane: ['#ff85c0', '#ffc2df', '#9ae6b4'], horn: '#ffd166', hoof: '#f78fb3', acc: 'flower', accColor: '#ff5ca8' },
  { id: 'marshmallow', name: 'Marshmallow', body: '#ffffff', mane: ['#ffc8dd', '#bde0fe', '#cdb4db'], horn: '#ffe5a8', hoof: '#cdb4db', acc: 'bow', accColor: '#a2d2ff' },
  { id: 'pebble', name: 'Pebble', body: '#e8e4ef', mane: ['#8d99ae', '#b8c0d0', '#6d7a99'], horn: '#ffd166', hoof: '#7d8597', acc: 'glasses', accColor: '#4a3366' },
  { id: 'sunny', name: 'Sunny', body: '#fff4b8', mane: ['#ff6b6b', '#ffa94d', '#ffd43b'], horn: '#ffffff', hoof: '#ff922b', acc: 'scarf', accColor: '#ff6b6b' },
  { id: 'willow', name: 'Willow', body: '#e6f8ec', mane: ['#38b26b', '#8ce99a', '#c3fae8'], horn: '#ffd166', hoof: '#51cf66', acc: 'flower', accColor: '#ffd43b' },
  { id: 'jellybean', name: 'Jellybean', body: '#fde2ff', mane: ['#ff6b6b', '#51cf66', '#339af0'], horn: '#ffd166', hoof: '#cc5de8', acc: 'heart', accColor: '#51cf66' },
  { id: 'comet', name: 'Comet', body: '#dff3ff', mane: ['#1c7ed6', '#74c0fc', '#ffffff'], horn: '#fff3b0', hoof: '#339af0', acc: 'star', accColor: '#ffffff', wings: '#ffffff' },
  { id: 'daisy', name: 'Daisy', body: '#ffffff', mane: ['#ffd43b', '#fff3bf', '#ffe066'], horn: '#ffa94d', hoof: '#fcc419', acc: 'flower', accColor: '#ffffff' },
  { id: 'misty', name: 'Misty', body: '#eef0ff', mane: ['#9775fa', '#c0eb75', '#66d9e8'], horn: '#e7f5ff', hoof: '#9775fa', acc: 'scarf', accColor: '#66d9e8' },
  { id: 'cinnamon', name: 'Cinnamon', body: '#f3d9c4', mane: ['#a0522d', '#d2691e', '#f4a261'], horn: '#ffd166', hoof: '#8b4513', acc: 'bow', accColor: '#e63946' },
  { id: 'nova', name: 'Nova', body: '#e5dbff', mane: ['#3b2a8c', '#7048e8', '#e599f7'], horn: '#ffe066', hoof: '#5f3dc4', acc: 'crown', accColor: '#ffd43b', wings: '#f3f0ff' },
  { id: 'peaches', name: 'Peaches', body: '#ffe8d6', mane: ['#ff8c69', '#ffb38a', '#ffd6a5'], horn: '#ffffff', hoof: '#ff8c69', acc: 'heart', accColor: '#ff6b81' },
  { id: 'pixie', name: 'Pixie', body: '#e3fafc', mane: ['#ff6fb5', '#63e6be', '#ffd43b'], horn: '#ffd166', hoof: '#20c997', acc: 'glasses', accColor: '#ff6fb5', wings: '#d0ebff' },
  { id: 'bramble', name: 'Bramble', body: '#f1e3ff', mane: ['#862e9c', '#c2255c', '#e64980'], horn: '#ffd166', hoof: '#862e9c', acc: 'flower', accColor: '#e64980' },
  { id: 'lolly', name: 'Lolly', body: '#fff0f6', mane: ['#f783ac', '#74c0fc', '#ffe066'], horn: '#ff8787', hoof: '#f783ac', acc: 'bow', accColor: '#74c0fc' },
  { id: 'skye', name: 'Skye', body: '#d0ebff', mane: ['#ffffff', '#a5d8ff', '#e7f5ff'], horn: '#ffe066', hoof: '#4dabf7', acc: 'scarf', accColor: '#ffffff', wings: '#ffffff' },
  { id: 'toffee', name: 'Toffee', body: '#ffe8cc', mane: ['#e8590c', '#fd7e14', '#ffc078'], horn: '#fff3bf', hoof: '#d9480f', acc: 'star', accColor: '#e8590c' },
  { id: 'poppy', name: 'Poppy', body: '#fff5f5', mane: ['#e03131', '#ff8787', '#ffc9c9'], horn: '#ffd166', hoof: '#e03131', acc: 'flower', accColor: '#e03131' },
  { id: 'dewdrop', name: 'Dewdrop', body: '#e6fcf5', mane: ['#0ca678', '#63e6be', '#96f2d7'], horn: '#d0ebff', hoof: '#12b886', acc: 'heart', accColor: '#4dabf7', wings: '#e6fcf5' },
  { id: 'biscuit', name: 'Biscuit', body: '#f8ecd4', mane: ['#b08968', '#ddb892', '#7f5539'], horn: '#ffd166', hoof: '#7f5539', acc: 'glasses', accColor: '#7f5539' },
  { id: 'starlight', name: 'Starlight', body: '#3b2a5c', mane: ['#ffd43b', '#ffffff', '#b197fc'], horn: '#ffd43b', hoof: '#b197fc', acc: 'star', accColor: '#ffd43b', wings: '#b197fc' },
  { id: 'rainbow', name: 'Rainbow', body: '#ffffff', mane: ['#ff6b6b', '#ffd43b', '#51cf66', '#339af0', '#9775fa'], horn: '#ffd43b', hoof: '#9775fa', acc: 'crown', accColor: '#ffd43b', wings: '#ffe3f1' },
  { id: 'goldie', name: 'Goldie', body: '#ffe066', mane: ['#ffffff', '#fff3bf', '#ffd8a8'], horn: '#ffffff', hoof: '#f59f00', acc: 'crown', accColor: '#ffffff', wings: '#fff9db' },
];

export function getUnicorn(id) {
  return UNICORNS.find((u) => u.id === id) || UNICORNS[0];
}

// ---- star costs: first surprise comes quickly, later ones take longer ----
export function giftCost(k) {
  // k = 1 for the first gift after the starter unicorn
  return k === 1 ? 5 : Math.min(8 + k, 25);
}
export function starsNeededFor(k) {
  let total = 0;
  for (let i = 1; i <= k; i++) total += giftCost(i);
  return total;
}

// ---- colour helpers ----
function hexToRgb(h) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function rgbToHex([r, g, b]) {
  return '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
}
export function mix(a, b, t) {
  const A = hexToRgb(a);
  const B = hexToRgb(b);
  return rgbToHex(A.map((v, i) => v + (B[i] - v) * t));
}

let uid = 0;

// Returns an SVG string. opts: { mood: 'normal' | 'happy', silhouette: bool, title }
export function unicornSVG(u, opts = {}) {
  const sil = !!opts.silhouette;
  const S = '#d9cdee';
  const body = sil ? S : u.body;
  const dark = sil ? '#cbbde3' : mix(u.body, '#8a6fb5', 0.22);
  const muzzle = sil ? S : mix(u.body, '#ffc2dc', 0.45);
  const mane = sil ? [S, S, S] : u.mane;
  const m = (i) => mane[i % mane.length];
  const horn = sil ? S : u.horn;
  const hornStripe = sil ? S : mix(u.horn, '#ff9f43', 0.35);
  const hoof = sil ? S : u.hoof;
  const ink = sil ? '#b9a8d6' : INK;
  const id = `u${++uid}`;
  const happy = opts.mood === 'happy';

  const stroke = `stroke="${ink}" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"`;

  // Tail curls (back)
  const tail = [
    [50, 116, 12, 0], [38, 128, 13, 1], [32, 145, 12, 2], [36, 161, 11, 0], [28, 175, 9, 1], [44, 176, 8, 2],
  ].map(([x, y, r, c]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${m(c)}" ${stroke}/>`).join('');

  const leg = (x, fill, hoofFill) => `
    <rect x="${x}" y="148" width="20" height="50" rx="9" fill="${fill}" ${stroke}/>
    <path d="M${x} 186 h20 v4 a8 8 0 0 1 -8 8 h-4 a8 8 0 0 1 -8 -8 Z" fill="${hoofFill}" ${stroke}/>`;

  const farLegs = leg(76, dark, mix(hoof, '#4a3366', sil ? 0 : 0.15)) + leg(144, dark, mix(hoof, '#4a3366', sil ? 0 : 0.15));
  const nearLegs = leg(58, body, hoof) + leg(126, body, hoof);

  // Body + neck + head drawn twice: thick outline layer, then fill layer -> one smooth outline.
  const bodyShapes = (attrs) => `
    <ellipse cx="105" cy="138" rx="54" ry="34" ${attrs}/>
    <path d="M122 124 C126 104 132 94 140 86 L176 98 C168 114 162 128 156 146 Z" ${attrs}/>
    <circle cx="158" cy="70" r="36" ${attrs}/>`;

  const maneBack = [
    [136, 40, 14, 0], [125, 54, 15, 1], [119, 72, 15, 2], [117, 90, 14, 0], [119, 108, 12, 1],
  ].map(([x, y, r, c]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${m(c)}" ${stroke}/>`).join('');

  const forelock = [
    [158, 35, 10, 1], [147, 38, 9, 2],
  ].map(([x, y, r, c]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="${m(c)}" ${stroke}/>`).join('');

  // Horn with spiral stripes
  const L0 = [164, 37], R0 = [180, 42], T = [194, 2];
  const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  const stripes = [0.22, 0.45, 0.68].map((t) => {
    const a = lerp(L0, T, t);
    const b = lerp(R0, T, t + 0.1);
    return `<line x1="${a[0].toFixed(1)}" y1="${a[1].toFixed(1)}" x2="${b[0].toFixed(1)}" y2="${b[1].toFixed(1)}" stroke="${hornStripe}" stroke-width="3.5" stroke-linecap="round"/>`;
  }).join('');
  const hornSvg = `<path d="M${L0} L${T} L${R0} Z" fill="${horn}" ${stroke}/>${sil ? '' : stripes}
    <path d="M${L0} L${T} L${R0} Z" fill="none" ${stroke}/>`;

  const ear = `<path d="M138 46 Q136 18 146 8 Q158 22 156 42 Z" fill="${body}" ${stroke}/>
    ${sil ? '' : `<path d="M142 40 Q141 24 146 16 Q152 26 151 38 Z" fill="${mix(u.body, '#ff9ec7', 0.55)}"/>`}`;

  const muzzleSvg = `<ellipse cx="194" cy="90" rx="22" ry="18" fill="${muzzle}" ${stroke}/>`;

  const face = sil ? '' : `
    ${happy
      ? `<path d="M159 68 Q167 57 175 68" fill="none" stroke="${INK}" stroke-width="3.5" stroke-linecap="round"/>`
      : `<ellipse cx="167" cy="66" rx="7.5" ry="10" fill="${INK}"/>
         <circle cx="170" cy="61.5" r="3" fill="#fff"/>
         <circle cx="164.5" cy="70.5" r="1.5" fill="#fff"/>`}
    ${happy ? '' : `<path d="M172 57 l5 -5 M168 55 l2 -6" stroke="${INK}" stroke-width="2.5" stroke-linecap="round"/>`}
    <ellipse cx="158" cy="86" rx="7.5" ry="4.5" fill="#ff7fb0" opacity="0.45"/>
    <ellipse cx="207" cy="86" rx="2.2" ry="3.2" fill="${INK}" opacity="0.65"/>
    <path d="M190 100 Q197 ${happy ? 108 : 105} 204 99" fill="none" stroke="${INK}" stroke-width="3" stroke-linecap="round"/>`;

  const wings = u.wings && !sil ? `
    <path d="M100 120 C96 96 76 76 48 72 C40 72 38 80 44 84 C34 88 36 98 48 98 C40 104 44 114 58 110 C54 118 62 126 74 120 C80 128 94 130 100 120 Z"
      fill="${u.wings}" ${stroke}/>
    <path d="M92 114 C86 100 74 90 60 86 M84 118 C80 108 70 102 60 100" fill="none" stroke="${mix(u.wings, '#8a6fb5', 0.35)}" stroke-width="2.5" stroke-linecap="round"/>` : '';

  const acc = sil ? '' : accessory(u, stroke);

  const title = opts.title ? `<title>${opts.title}</title>` : '';
  return `<svg viewBox="0 0 240 220" xmlns="http://www.w3.org/2000/svg" class="unicorn-svg" role="img" aria-label="${opts.title || u.name}" data-id="${id}">
    ${title}
    <ellipse cx="112" cy="206" rx="74" ry="7" fill="#5a3d8a" opacity="0.12"/>
    ${tail}
    ${farLegs}
    ${bodyShapes(`fill="${ink}" stroke="${ink}" stroke-width="6"`)}
    ${bodyShapes(`fill="${body}"`)}
    ${nearLegs}
    <ellipse cx="105" cy="138" rx="54" ry="34" fill="none" />
    ${maneBack}
    ${ear}
    ${hornSvg}
    ${muzzleSvg}
    ${forelock}
    ${face}
    ${wings}
    ${acc}
    ${sil ? `<text x="112" y="150" text-anchor="middle" font-size="60" font-weight="700" fill="#ffffff" font-family="Andika, sans-serif">?</text>` : ''}
  </svg>`;
}

function accessory(u, stroke) {
  const c = u.accColor || '#ff6fb5';
  switch (u.acc) {
    case 'bow':
      return `<g transform="translate(128 40) rotate(-20)">
        <path d="M0 0 L-16 -10 L-16 10 Z" fill="${c}" ${stroke}/>
        <path d="M0 0 L16 -10 L16 10 Z" fill="${c}" ${stroke}/>
        <circle r="5" fill="${mix(c, '#ffffff', 0.35)}" ${stroke}/></g>`;
    case 'flower': {
      const petals = [0, 72, 144, 216, 288].map((a) =>
        `<ellipse cx="0" cy="-8" rx="5.5" ry="8" fill="${c}" ${stroke} transform="rotate(${a})"/>`).join('');
      return `<g transform="translate(128 46)">${petals}<circle r="5" fill="#ffd43b" ${stroke}/></g>`;
    }
    case 'star':
      return `<path transform="translate(80 140) scale(0.9)" d="${starPath(0, 0, 13, 6)}" fill="${c}" ${stroke}/>`;
    case 'heart':
      return `<path transform="translate(80 132)" d="M0 6 C-14 -6 -6 -16 0 -8 C6 -16 14 -6 0 6 Z" fill="${c}" ${stroke}/>`;
    case 'glasses':
      return `<g fill="none" stroke="${c}" stroke-width="3">
        <circle cx="167" cy="66" r="13" fill="#ffffff" fill-opacity="0.25"/>
        <path d="M154 63 L140 58"/></g>`;
    case 'scarf':
      return `<path d="M128 104 C142 114 158 118 174 110 L176 122 C160 130 142 126 124 116 Z" fill="${c}" ${stroke}/>
        <path d="M136 116 L130 140 L142 140 L146 120 Z" fill="${c}" ${stroke}/>`;
    case 'crown':
      return `<g transform="translate(160 22) rotate(-8)">
        <path d="M-14 10 L-14 -6 L-7 2 L0 -10 L7 2 L14 -6 L14 10 Z" fill="${c}" ${stroke}/>
        <circle cx="0" cy="3" r="3" fill="#ff6fb5"/></g>`;
    default:
      return '';
  }
}

export function starPath(cx, cy, R, r) {
  let d = '';
  for (let i = 0; i < 10; i++) {
    const a = (Math.PI / 5) * i - Math.PI / 2;
    const rad = i % 2 === 0 ? R : r;
    d += (i === 0 ? 'M' : 'L') + (cx + rad * Math.cos(a)).toFixed(1) + ' ' + (cy + rad * Math.sin(a)).toFixed(1) + ' ';
  }
  return d + 'Z';
}
