// מסך התקדמות: משקל עם מגמה, כוח (1RM משוער), ריצה, מפת שרירים, היסטוריה.
import { html, esc, on, fmtDate, fmtTime } from '../ui/dom.js';
import { lineChart, bars, bodyMap } from '../ui/charts.js';
import { get } from '../store.js';
import { EX, MUSCLES } from '../data/exercises.js';
import { bestSet } from '../engine/progression.js';
import { weightTrend, muscleLoad } from '../engine/stats.js';
import { next3kTarget } from '../engine/running.js';
import { weightSheet } from './home.js';

let tab = 'weight';
let liftSel = null;

export function renderProgress(root) {
  const s = get();
  const p = s.profile;
  const tabs = [['weight', '⚖️ משקל'], ['strength', '💪 כוח'], ['run', '🏃 ריצה'], ['body', '🫀 גוף']];
  root.innerHTML = html`<div class="eyebrow">מעקב ומדדים</div><div class="h1">ההתקדמות שלך</div>
    <div class="seg" style="margin:14px 0">${tabs.map(([k, t]) => `<button data-tab="${k}" class="${tab === k ? 'on' : ''}">${t}</button>`)}</div>
    <div id="tabc">${TABS[tab](s, p)}</div>
    <div class="h2">🗂️ היסטוריה</div>
    <div class="card tight list-hist">${history(s)}</div>`;
  on(root, 'click', '[data-tab]', (e, t) => { tab = t.dataset.tab; renderProgress(root); });
  on(root, 'click', '[data-lift]', (e, t) => { liftSel = t.dataset.lift; renderProgress(root); });
  on(root, 'click', '[data-act="weigh"]', () => weightSheet(() => renderProgress(root)));
}

const TABS = {
  weight(s, p) {
    const W = weightTrend(s.weights);
    const first = W[0]?.kg, last = W[W.length - 1];
    const diff = last && first != null ? Math.round((last.trend - first) * 10) / 10 : 0;
    const toGo = last ? Math.round((p.targetWeight - last.trend) * 10) / 10 : 0;
    return html`<div class="kpis"><div class="kpi"><b>${last ? last.kg : '—'}</b><span>נוכחי</span></div>
        <div class="kpi ${(p.targetWeight > first) === (diff > 0) && diff ? 'up' : ''}"><b>${diff > 0 ? '+' : ''}${diff}</b><span>שינוי (מגמה)</span></div>
        <div class="kpi"><b>${p.targetWeight}</b><span>יעד (${toGo > 0 ? '+' : ''}${toGo})</span></div></div>
      <div class="card" style="margin-top:12px">${lineChart([
        { values: W.map((x) => ({ x: fmtDate(x.date), y: x.kg })), color: 'rgba(255,255,255,.35)', width: 1.5 },
        { values: W.map((x) => ({ x: fmtDate(x.date), y: x.trend })), color: '#c8ff3c', fill: true, dots: false, width: 3 }], { target: p.targetWeight })}
        <div class="legend"><span><i style="background:#c8ff3c"></i>מגמה</span><span><i style="background:rgba(255,255,255,.35)"></i>שקילה</span><span><i style="background:#ff8a3d"></i>יעד</span></div></div>
      <button class="btn primary block" style="margin-top:12px" data-act="weigh">+ שקילה חדשה</button>
      <p class="sub" style="margin-top:10px">💡 המגמה (ממוצע נע) מסננת תנודות של מים ומלח — זה המספר האמיתי. קצב בריא: ${p.goal === 'cut' ? 'ירידה של 0.3–0.7 ק״ג בשבוע' : 'עלייה של 0.2–0.4 ק״ג בשבוע'}.</p>`;
  },
  strength(s) {
    const lifts = Object.keys(s.history).filter((id) => EX[id]?.type === 'weight' && s.history[id].length);
    if (!lifts.length) return '<div class="card"><div class="empty"><div class="e">🏋️</div>אחרי האימון הראשון יופיעו כאן גרפי כוח ושיאים</div></div>';
    const sel = liftSel && lifts.includes(liftSel) ? liftSel : lifts.sort((a, b) => s.history[b].length - s.history[a].length)[0];
    const h = s.history[sel];
    const pts = h.map((x) => ({ x: fmtDate(x.date), y: Math.round(bestSet(x.sets)?.e1rm || 0) }));
    const best = Math.max(...pts.map((x) => x.y));
    const gain = pts.length > 1 ? Math.round(((pts[pts.length - 1].y - pts[0].y) / (pts[0].y || 1)) * 100) : 0;
    const prs = Object.entries(s.history).filter(([id]) => EX[id]?.type === 'weight').map(([id, hh]) => {
      const b = hh.map((x) => bestSet(x.sets)).filter(Boolean).sort((a, c) => c.e1rm - a.e1rm)[0];
      return b ? { id, b } : null;
    }).filter(Boolean).sort((a, b) => b.b.e1rm - a.b.e1rm);
    return html`<div class="chips" style="margin-bottom:10px">${lifts.map((id) => `<button class="chip ${id === sel ? 'on' : ''}" data-lift="${id}">${EX[id].name}</button>`)}</div>
      <div class="kpis"><div class="kpi up"><b>${best}</b><span>1RM משוער</span></div><div class="kpi"><b>${h.length}</b><span>אימונים</span></div><div class="kpi ${gain > 0 ? 'up' : ''}"><b>${gain > 0 ? '+' : ''}${gain}%</b><span>שיפור</span></div></div>
      <div class="card" style="margin-top:12px">${lineChart([{ values: pts, color: '#c8ff3c', fill: true }])}<div class="sub" style="font-size:12px">1RM משוער (נוסחת Epley) — המשקל המקסימלי לחזרה אחת</div></div>
      <div class="h2">🏆 שיאים אישיים</div>
      <div class="card tight">${prs.map(({ id, b }) => `<div class="ex-row"><div><div class="t">${EX[id].name}</div><div class="s">${b.w} ק״ג × ${b.reps}</div></div><div class="w">${Math.round(b.e1rm)}<small>1RM</small></div></div>`).join('')}</div>`;
  },
  run(s, p) {
    const tests = s.runs.filter((r) => r.type === 'test' && r.timeSec);
    const best = tests.length ? Math.min(...tests.map((r) => r.timeSec)) : p.run3k;
    const weekly = lastWeeks(8).map((wk) => ({ x: wk.label, y: Math.round(s.runs.filter((r) => inWeek(r.date, wk)).reduce((a, r) => a + r.durationSec, 0) / 60) }));
    return html`<div class="kpis"><div class="kpi up"><b>${best ? fmtTime(best) : '—'}</b><span>3 ק״מ שיא</span></div>
        <div class="kpi"><b>${best ? fmtTime(next3kTarget(best)) : '14:00'}</b><span>יעד הבא</span></div><div class="kpi"><b>${s.runs.length}</b><span>ריצות</span></div></div>
      <div class="card" style="margin-top:12px"><b>מבדקי 3 ק״מ</b>${tests.length ? lineChart([{ values: tests.map((r) => ({ x: fmtDate(r.date), y: Math.round((r.timeSec / 60) * 100) / 100 })), color: '#ff8a3d', fill: false }]) : '<div class="empty">המבדק הראשון יגיע בשבוע הפריקה (שבוע 4)</div>'}
        <div class="sub" style="font-size:12px">זמן בדקות — נמוך יותר = טוב יותר</div></div>
      <div class="card" style="margin-top:12px"><b>דקות ריצה בשבוע</b>${bars(weekly, { color: '#22e6d0' })}</div>`;
  },
  body(s) {
    const load = muscleLoad(s.sessions);
    const total = Object.values(load).reduce((a, b) => a + b, 0);
    const vol = lastWeeks(8).map((wk) => ({ x: wk.label, y: Math.round(s.sessions.filter((x) => inWeek(x.date, wk)).reduce((a, x) => a + (x.volume || 0), 0) / 1000) }));
    const top = Object.entries(load).sort((a, b) => b[1] - a[1]);
    const missing = Object.keys(MUSCLES).filter((m) => !load[m]);
    return html`<div class="card"><b>מפת שרירים — 7 ימים אחרונים</b><div class="sub" style="font-size:12px;margin-bottom:8px">צבע בהיר = יותר סטים</div>
        ${bodyMap(load)}
        ${total ? `<div class="chips" style="margin-top:10px">${top.slice(0, 6).map(([m, v]) => `<span class="tag lime">${MUSCLES[m]} ${Math.round(v)}</span>`).join('')}</div>` : ''}
        ${total && missing.length ? `<div class="sub" style="margin-top:8px">לא עבדו השבוע: ${missing.map((m) => MUSCLES[m]).join(', ')}</div>` : ''}</div>
      <div class="card" style="margin-top:12px"><b>נפח שבועי (טון)</b>${bars(vol)}</div>`;
  },
};

function history(s) {
  const items = [
    ...s.sessions.map((x) => ({ date: x.date, ico: x.field ? '🎒' : '🏋️', t: x.name, sub: `${fmtTime(x.durationSec)} · ${x.setsDone} סטים · ${(x.volume || 0).toLocaleString('he-IL')} ק״ג${x.prs?.length ? ` · ${x.prs.length} שיאים` : ''}` })),
    ...s.runs.map((r) => ({ date: r.date, ico: '🏃', t: r.name, sub: `${fmtTime(r.durationSec)}${r.distanceKm ? ` · ${r.distanceKm} ק״מ` : ''}${r.timeSec ? ` · 3 ק״מ ב-${fmtTime(r.timeSec)}` : ''}` })),
  ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 15);
  if (!items.length) return '<div class="empty"><div class="e">🗓️</div>עוד אין אימונים. הראשון מחכה לך!</div>';
  return items.map((x) => `<div class="it"><div class="ico">${x.ico}</div><div><div style="font-weight:800">${esc(x.t)}</div><div class="sub" style="font-size:12px">${fmtDate(x.date)} · ${esc(x.sub)}</div></div></div>`).join('');
}

function lastWeeks(n) {
  const out = [];
  const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - d.getDay());
  for (let i = n - 1; i >= 0; i--) {
    const start = new Date(d); start.setDate(d.getDate() - i * 7);
    const end = new Date(start); end.setDate(start.getDate() + 7);
    out.push({ start, end, label: `${start.getDate()}/${start.getMonth() + 1}` });
  }
  return out;
}
const inWeek = (iso, wk) => { const t = new Date(iso); return t >= wk.start && t < wk.end; };
