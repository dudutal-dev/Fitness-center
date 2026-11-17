// מסך הבית: מאמן הולוגרפי, מדד כשירות קרבית, משימת היום, שבוע, מעקבים מהירים.
import { html, esc, on, sheet, toast, greeting, icon, fmtDate } from '../ui/dom.js';
import { ring } from '../ui/charts.js';
import { get, set, daily, setDaily, today, addXP, XP, g } from '../store.js';
import { COACHES, demoPoster } from '../data/coaches.js';
import { EX } from '../data/exercises.js';
import { combatReadiness, rankFor, streak, readinessScore } from '../engine/stats.js';
import { targets, dayTotals } from '../engine/nutrition.js';
import { buildFieldWorkout } from '../engine/program.js';
import { say, onSpeaking, unlock } from '../coach/voice.js';
import { MOTIVATION_KEYS, lineFor } from '../data/voice-lines.js';
import { startWorkout } from './workout.js';
import { startRun } from './run.js';

export function nextSession(s) {
  const done = new Set(s.plan.completedDays);
  return s.plan.week.sessions.find((x) => !done.has(x.day)) || null;
}

export function estMinutes(w) {
  const t = w.items.reduce((a, it) => a + it.sets * (40 + it.rest), 0) / 60 + 8 + (w.finisher ? 8 : 0);
  return Math.round(t / 5) * 5;
}

function coachLine(s) {
  const p = s.profile;
  const st = streak([...s.sessions, ...s.runs]);
  const ns = nextSession(s);
  if (!s.sessions.length && !s.runs.length) return { key: 'workout_start', text: `<b>${esc(p.name)}</b>, התוכנית שלך מוכנה. האימון הראשון הוא הכי חשוב — ${g('בוא', 'בואי')} נעשה אותו יחד.` };
  if (st >= 3) return { key: 'streak', text: `רצף של <b>${st} ימים</b>! ככה בונים לוחם. ${ns ? `היום: ${esc(ns.name)}.` : ''}` };
  const key = MOTIVATION_KEYS[new Date().getDate() % MOTIVATION_KEYS.length];
  return { key, text: `${esc(lineFor(key, p.coach, p.sex))} ${ns ? `<br>המשימה הבאה: <b>${esc(ns.name)}</b>.` : ''}` };
}

export function renderHome(root) {
  const s = get();
  const p = s.profile;
  const coach = COACHES[p.coach];
  const cri = combatReadiness({ profile: p, history: s.history, sessions: s.sessions, runs: s.runs, weights: s.weights });
  const rank = rankFor(s.xp);
  const st = streak([...s.sessions, ...s.runs]);
  const ns = nextSession(s);
  const dd = daily();
  const t = targets(p);
  const line = coachLine(s);
  const doneDays = new Set(s.plan.completedDays);
  const lastW = s.weights[s.weights.length - 1];
  const heroEx = ns?.items[0]?.exId || 'back_squat';

  root.innerHTML = html`
    <div class="topbar">
      <div class="brand"><span class="brand-mark">L</span>LOHEM</div>
      <div class="row">
        <span class="tag orange">🔥 <span class="num">${st}</span></span>
        <span class="tag lime">${rank.icon} ${rank.name}</span>
        <a href="#/guide" class="icon-btn help-btn" aria-label="מדריך שימוש">?</a>
        <a href="#/coach" class="avatar" aria-label="המאמן והגדרות"><img src="${coach.face}" alt=""></a>
      </div>
    </div>
    <div class="sub">${greeting()},</div>
    <div class="h1">${esc(p.name)} 👊</div>

    <div class="card coach-hero hud" style="margin-top:14px">
      <div class="holo"><span class="live-badge">LIVE</span><img src="${coach.face}" alt="${coach.name}"></div>
      <div>
        <div class="eyebrow">${coach.name} · ${coach.title}</div>
        <div class="bubble" style="margin-top:8px">${line.text}</div>
        <button class="speak" data-act="speak" data-key="${line.key}"><span class="wave"><i></i><i></i><i></i><i></i></span> השמע</button>
      </div>
    </div>

    <div class="card" style="margin-top:12px">
      <div class="cri">
        ${ring(cri.score / 100, { big: cri.score, lbl: 'כשירות קרבית' })}
        <div>
          ${meter('💪 כוח', cri.parts.strength)}${meter('🏃 סבולת', cri.parts.endurance)}
          ${meter('📅 עקביות', cri.parts.consistency)}${meter('⚖️ גוף', cri.parts.body)}
        </div>
      </div>
      <div class="bar" style="margin-top:6px"><i style="width:${rank.pct * 100}%"></i></div>
      <div class="row between sub" style="font-size:12px;margin-top:6px"><span>${rank.icon} ${rank.name} · <span class="num">${s.xp}</span> XP</span><span>${rank.next ? `${rank.next.icon} ${rank.next.name} ב-<span class="num">${rank.next.xp}</span>` : 'דרגה מקסימלית'}</span></div>
    </div>

    <div class="h2">🎯 משימת היום</div>
    ${ns ? html`<div class="card mission hud">
      <div class="media"><img src="${demoPoster(p.coach, heroEx)}" alt="">
        <div class="over"><div class="eyebrow">אימון ${ns.day} מתוך ${s.plan.week.sessions.length} · ${esc(s.plan.week.phase.name)}</div>
        <div class="h1" style="font-size:26px">${esc(ns.name)}</div><div class="sub">${esc(ns.focus)}</div></div></div>
      <div class="body">
        <div class="stats"><div><b>${estMinutes(ns)}</b>דקות</div><div><b>${ns.items.length}</b>תרגילים</div>
          <div><b>${ns.items.reduce((a, b) => a + b.sets, 0)}</b>סטים</div>${ns.run ? `<div><b>${ns.run.icon}</b>${esc(ns.run.name)}</div>` : ''}</div>
        <button class="btn primary block xl" data-act="start">${icon('play', 'width="22" height="22"')} ${g('צא', 'צאי')} לאימון</button>
        ${ns.run ? `<button class="btn block" style="margin-top:8px" data-act="run">🏃 רק ריצה: ${esc(ns.run.name)}</button>` : ''}
      </div></div>`
    : html`<div class="card hud"><div class="empty"><div class="e">🏆</div><b>השבוע הושלם!</b><div>מנוחה — השבוע הבא נטען אוטומטית.</div></div></div>`}

    <div class="week" style="margin-top:12px">${s.plan.week.sessions.map((x) => `<div class="d ${doneDays.has(x.day) ? 'done' : ns?.day === x.day ? 'next' : ''}"><span class="n">${doneDays.has(x.day) ? '✓' : x.day}</span>${x.run ? '🏃' : '🏋️'}</div>`)}</div>

    <button class="btn block" style="margin-top:12px" data-act="field">🎒 אין חדר כושר היום? אימון שטח בלי ציוד</button>

    <div class="h2">📊 היום</div>
    <div class="grid2">
      <div class="card tight tracker" data-act="water"><div class="ic">💧</div><div><div class="v num">${(dd.water / 1000).toFixed(1)}<small> / ${t.waterL} ל׳</small></div><div class="sub" style="font-size:12px">+250 מ״ל</div></div></div>
      <div class="card tight tracker" data-act="protein"><div class="ic">🥩</div><div><div class="v num">${dayTotals(dd, p.customFoods).p}<small> / ${t.protein} ג׳</small></div><div class="sub" style="font-size:12px">+20 גרם חלבון</div></div></div>
      <div class="card tight tracker" data-act="weight"><div class="ic">⚖️</div><div><div class="v num">${lastW ? lastW.kg : '—'}<small> ק״ג</small></div><div class="sub" style="font-size:12px">${lastW ? `עודכן ${fmtDate(lastW.date)}` : 'שקילה'}</div></div></div>
      <div class="card tight tracker" data-act="checkin"><div class="ic">🧠</div><div><div class="v">${dd.checkin != null ? `<span class="num">${Math.round(dd.checkin * 100)}%</span>` : '—'}</div><div class="sub" style="font-size:12px">מוכנות יומית</div></div></div>
    </div>

    ${s.events.length ? html`<div class="h2">📣 עדכונים</div><div class="card tight list-hist">${s.events.slice(0, 4).map((e) => `<div class="it"><div class="ico">${e.type === 'pr' ? '🏆' : e.type === 'rank' ? '🎖️' : e.type === 'level' ? '🚀' : '💬'}</div><div><div style="font-weight:700;font-size:14px">${esc(e.text)}</div><div class="sub" style="font-size:12px">${fmtDate(e.date)}</div></div></div>`)}</div>` : ''}
  `;

  const off = onSpeaking((v) => root.querySelector('.speak')?.classList.toggle('speaking', v));
  root._cleanup = off;

  on(root, 'click', '[data-act]', (e, el) => {
    unlock();
    const a = el.dataset.act;
    if (a === 'speak') say(el.dataset.key, { priority: true });
    if (a === 'start') checkIn((r) => startWorkout(ns, { readiness: r }));
    if (a === 'run') startRun(ns.run, { day: ns.day });
    if (a === 'field') checkIn((r) => startWorkout({ ...buildFieldWorkout(p), day: null, field: true }, { readiness: r }));
    if (a === 'water') { setDaily({ water: dd.water + 250 }); if (dd.water + 250 >= t.waterL * 1000 && dd.water < t.waterL * 1000) { addXP(XP.water * 4); toast('💧 יעד שתייה הושלם!'); } renderHome(root); }
    if (a === 'protein') { setDaily({ protein: dd.protein + 20 }); renderHome(root); }
    if (a === 'weight') weightSheet(() => renderHome(root));
    if (a === 'checkin') checkIn(() => renderHome(root), true);
  });
}

const meter = (label, v) => `<div class="meter"><div class="row"><span>${label}</span><span>${v}</span></div><div class="bar"><i style="width:${v}%"></i></div></div>`;

// צ׳ק־אין מוכנות לפני אימון → אוטו־רגולציה
export function checkIn(cb, onlyLog = false) {
  const existing = daily().checkin;
  if (existing != null && !onlyLog) return cb(existing);
  const q = { sleep: 3, energy: 3, soreness: 3, stress: 3 };
  const Q = [['sleep', 'איך ישנת?', ['😵', '😴', '😐', '🙂', '😎']], ['energy', 'רמת אנרגיה', ['🪫', '😮‍💨', '😐', '⚡', '🔥']],
    ['soreness', 'כאבי שרירים', ['✨', '🙂', '😐', '😣', '🥵']], ['stress', 'עומס בצבא / לחץ', ['🧘', '🙂', '😐', '😤', '🤯']]];
  sheet(html`<div class="eyebrow">צ׳ק־אין לפני אימון</div><div class="h1" style="font-size:24px">${g('איך אתה מרגיש', 'איך את מרגישה')} היום?</div>
    <p class="sub">המאמן יתאים את עומס האימון למצב שלך — אחרי יום שטח קשה מורידים, ביום טוב מגבירים.</p>
    ${Q.map(([k, t, em]) => html`<div style="margin:14px 0 6px;font-weight:700">${t}</div>
      <div class="rpe" style="grid-template-columns:repeat(5,1fr)" data-q="${k}">${em.map((x, i) => `<button data-v="${i + 1}" class="${q[k] === i + 1 ? 'on' : ''}"><span>${x}</span></button>`)}</div>`)}
    <button class="btn primary block xl" style="margin-top:20px" data-go>${onlyLog ? 'שמור' : 'יאללה, לאימון'}</button>`, {
    onMount(sh, close) {
      on(sh, 'click', '[data-q] button', (e, b) => {
        const k = b.parentElement.dataset.q; q[k] = Number(b.dataset.v);
        b.parentElement.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
      });
      sh.querySelector('[data-go]').addEventListener('click', () => {
        const r = readinessScore(q);
        const first = daily().checkin == null;
        setDaily({ checkin: r });
        if (first) addXP(XP.checkin);
        say(r < 0.45 ? 'checkin_low' : r > 0.8 ? 'checkin_high' : 'workout_start', { priority: true });
        close(); cb(r);
      });
    },
  });
}

export function weightSheet(cb) {
  const s = get();
  const last = s.weights[s.weights.length - 1]?.kg ?? s.profile.weightKg;
  let v = last;
  sheet(html`<div class="eyebrow">שקילה</div><div class="h1" style="font-size:24px">${g('כמה אתה שוקל', 'כמה את שוקלת')} היום?</div>
    <p class="sub">הכי מדויק: בבוקר, אחרי שירותים, לפני אוכל. המגמה חשובה יותר מכל שקילה בודדת.</p>
    <div class="stepper" style="margin:18px 0"><button data-d="-0.1">−</button><div class="val"><span id="wv">${v.toFixed(1)}</span><small>ק״ג</small></div><button data-d="0.1">+</button></div>
    <div class="row"><button class="btn sm" data-d="-1">−1</button><button class="btn sm" data-d="-0.5">−0.5</button><span class="spacer"></span><button class="btn sm" data-d="0.5">+0.5</button><button class="btn sm" data-d="1">+1</button></div>
    <button class="btn primary block xl" style="margin-top:18px" data-save>שמור</button>`, {
    onMount(sh, close) {
      on(sh, 'click', '[data-d]', (e, b) => { v = Math.round((v + Number(b.dataset.d)) * 10) / 10; sh.querySelector('#wv').textContent = v.toFixed(1); });
      sh.querySelector('[data-save]').addEventListener('click', () => {
        set((st) => {
          st.weights = st.weights.filter((w) => w.date !== today()).concat({ date: today(), kg: v });
          st.profile.weightKg = v;
          return st;
        });
        addXP(XP.weight);
        toast('⚖️ נשמר');
        close(); cb?.();
      });
    },
  });
}
