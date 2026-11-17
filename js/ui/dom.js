// עזרי DOM קטנים: תבניות, טוסט, sheet, קונפטי, אייקונים.
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function html(strings, ...vals) {
  return strings.reduce((out, s, i) => out + s + (i < vals.length ? (Array.isArray(vals[i]) ? vals[i].join('') : vals[i] ?? '') : ''), '');
}

export function el(markup) {
  const t = document.createElement('template');
  t.innerHTML = markup.trim();
  return t.content.firstElementChild;
}

// מאזין אירועים מואצל: on(root, 'click', '[data-act]', fn)
// רישום חוזר עם אותו (type, sel) מחליף את המטפל הקודם — כך רינדור מחדש של מסך לא מכפיל מאזינים.
export function on(root, type, sel, fn) {
  root._on ||= {};
  const key = `${type}|${sel}`;
  if (!root._on[key]) {
    root.addEventListener(type, (e) => {
      const t = e.target.closest(sel);
      if (t && root.contains(t)) root._on[key](e, t);
    });
  }
  root._on[key] = fn;
}

let toastT;
export function toast(text, ms = 2600) {
  document.querySelector('.toast')?.remove();
  const t = el(`<div class="toast" role="status">${esc(text)}</div>`);
  document.body.append(t);
  clearTimeout(toastT);
  toastT = setTimeout(() => t.remove(), ms);
}

export function sheet(markup, { onMount, onClose } = {}) {
  const back = el('<div class="sheet-back"></div>');
  const sh = el(`<div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div>${markup}</div>`);
  const close = () => { back.remove(); sh.remove(); onClose?.(); };
  back.addEventListener('click', close);
  on(sh, 'click', '[data-close]', close);
  document.body.append(back, sh);
  onMount?.(sh, close);
  return close;
}

export function confetti(n = 90) {
  const box = el('<div class="confetti"></div>');
  const colors = ['#c8ff3c', '#22e6d0', '#ff8a3d', '#ffffff', '#9b7bff'];
  for (let i = 0; i < n; i++) {
    const c = document.createElement('i');
    c.style.left = `${Math.random() * 100}%`;
    c.style.background = colors[i % colors.length];
    c.style.animationDuration = `${1.8 + Math.random() * 1.8}s`;
    c.style.animationDelay = `${Math.random() * 0.6}s`;
    c.style.transform = `rotate(${Math.random() * 360}deg)`;
    box.append(c);
  }
  document.body.append(box);
  setTimeout(() => box.remove(), 4500);
}

export function vibrate(p = 30) { try { navigator.vibrate?.(p); } catch { /* */ } }

export const fmtTime = (sec) => {
  sec = Math.max(0, Math.round(sec));
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
};

export const fmtDate = (iso) => new Date(iso).toLocaleDateString('he-IL', { day: 'numeric', month: 'short' });

export function greeting() {
  const h = new Date().getHours();
  return h < 5 ? 'לילה טוב' : h < 12 ? 'בוקר טוב' : h < 17 ? 'צהריים טובים' : h < 21 ? 'ערב טוב' : 'לילה טוב';
}

// אייקוני קו (SVG)
const P = {
  home: '<path d="M3 11l9-8 9 8v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  plan: '<rect x="3" y="4" width="18" height="17" rx="3"/><path d="M3 9h18M8 2v4M16 2v4M7 13h4M7 17h7"/>',
  bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
  chart: '<path d="M3 3v18h18"/><path d="M7 15l4-5 3 3 5-7"/>',
  food: '<path d="M7 2v9a3 3 0 0 0 3 3v8M4 2v6a3 3 0 0 0 3 3M10 2v6M17 2c-2 2-3 5-3 8h4v12"/>',
  coach: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  play: '<path d="M7 4l13 8-13 8z"/>',
  close: '<path d="M6 6l12 12M18 6L6 18"/>',
  swap: '<path d="M4 7h13l-3-3M20 17H7l3 3"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 8h.01M11 12h1v5h1"/>',
  pause: '<path d="M8 5v14M16 5v14"/>',
  skip: '<path d="M5 5l9 7-9 7zM18 5v14"/>',
  vol: '<path d="M4 9v6h4l5 4V5L8 9zM16 9a4 4 0 0 1 0 6M19 6a8 8 0 0 1 0 12"/>',
  mute: '<path d="M4 9v6h4l5 4V5L8 9zM17 9l5 6M22 9l-5 6"/>',
  // שלבי חזרה (במקום אמוג׳י — אחיד בכל המכשירים)
  phUp: '<path d="M6 13l6-6 6 6"/><path d="M6 19l6-6 6 6" opacity=".45"/>',
  phDown: '<path d="M6 11l6 6 6-6"/><path d="M6 5l6 6 6-6" opacity=".45"/>',
  phPull: '<path d="M19 12H7"/><path d="M11 7l-5 5 5 5"/><path d="M3 5v14"/>',
  phRelease: '<path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4v4h4"/>',
  phHold: '<rect x="7" y="5" width="3.5" height="14" rx="1.2"/><rect x="13.5" y="5" width="3.5" height="14" rx="1.2"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7"/>',
  chev: '<path d="M15 6l-6 6 6 6"/>',
  run: '<circle cx="14" cy="4.5" r="2"/><path d="M7 21l3-6 3 2v5M6 11l3-3 4 1 2 4 3 1"/>',
  pack: '<rect x="5" y="7" width="14" height="14" rx="3"/><path d="M9 7V5a3 3 0 0 1 6 0v2M5 13h14"/>',
  download: '<path d="M12 4v11"/><path d="M7 10l5 5 5-5"/><path d="M5 20h14"/>',
  upload: '<path d="M12 20V9"/><path d="M7 14l5-5 5 5"/><path d="M5 4h14"/>',
};
export const icon = (name, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ${extra}>${P[name] || ''}</svg>`;
