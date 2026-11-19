// Small DOM helpers shared by all screens.

export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k === 'html') el.innerHTML = v;
    else if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (v === true) el.setAttribute(k, '');
    else el.setAttribute(k, v);
  }
  for (const c of children.flat(Infinity)) {
    if (c === null || c === undefined || c === false) continue;
    el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  }
  return el;
}

export function clear(el) {
  while (el.firstChild) el.removeChild(el.firstChild);
  return el;
}

export const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// Burst of sparkles from an element (or the middle of the screen).
export function sparkleBurst(from, count = 18) {
  const rect = from ? from.getBoundingClientRect() : { left: innerWidth / 2, top: innerHeight / 2, width: 0, height: 0 };
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const glyphs = ['✨', '⭐', '💖', '🌟', '💜', '🦄', '🌈'];
  const layer = document.getElementById('fx') || document.body;
  if (document.body.classList.contains('calm')) count = Math.ceil(count / 3);
  for (let i = 0; i < count; i++) {
    const s = h('span', { class: 'spark' }, glyphs[Math.floor(Math.random() * glyphs.length)]);
    const angle = Math.random() * Math.PI * 2;
    const dist = 80 + Math.random() * 180;
    s.style.left = cx + 'px';
    s.style.top = cy + 'px';
    s.style.setProperty('--dx', Math.cos(angle) * dist + 'px');
    s.style.setProperty('--dy', Math.sin(angle) * dist - 60 + 'px');
    s.style.setProperty('--rot', Math.random() * 360 - 180 + 'deg');
    s.style.fontSize = 18 + Math.random() * 22 + 'px';
    layer.append(s);
    setTimeout(() => s.remove(), 1400);
  }
}

// Gentle "no" shake for an element.
export function shake(el) {
  if (!el) return;
  el.classList.remove('shake');
  void el.offsetWidth;
  el.classList.add('shake');
  setTimeout(() => el.classList.remove('shake'), 500);
}

export function pop(el) {
  if (!el) return;
  el.classList.remove('pop');
  void el.offsetWidth;
  el.classList.add('pop');
}

export function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function formatDate(t) {
  if (!t) return '–';
  const d = new Date(t);
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

// Simple modal dialog. buttons: [{ label, value, class }]
export function dialog({ title, body, buttons }) {
  return new Promise((resolve) => {
    const close = (v) => {
      overlay.remove();
      resolve(v);
    };
    const overlay = h('div', { class: 'modal-back' },
      h('div', { class: 'modal', role: 'dialog', 'aria-modal': 'true' },
        title ? h('h2', {}, title) : null,
        body ? (typeof body === 'string' ? h('p', {}, body) : body) : null,
        h('div', { class: 'modal-buttons' },
          buttons.map((b) => h('button', { class: 'btn ' + (b.class || ''), onclick: () => close(b.value) }, b.label)))));
    document.body.append(overlay);
    const first = overlay.querySelector('.btn');
    if (first) first.focus();
  });
}
