// מסך הבית: מסך אחד בלי גלילה — האימון הבא, שורת המאמן, המעקב היומי ומדד הכושר. התראות ופירוט בחלוניות.
import { html, esc, on, sheet, toast, greeting, icon, ib, emi, fmtDate } from '../ui/dom.js';
import { ring } from '../ui/charts.js';
import { get, set, daily, setDaily, today, addXP, XP, g } from '../store.js';
import { COACHES, demoPoster } from '../data/coaches.js';
import { EX } from '../data/exercises.js';
import { combatReadiness, rankFor, streak, readinessScore } from '../engine/stats.js';
import { dayTotals, dayType, dayTargets, wantsNutrition, mealPlan, menuToday, orderMeals, mealWindow } from '../engine/nutrition.js';
import { FOOD } from '../data/foods.js';
import { openNutritionTab } from './nutrition.js';
import { buildFieldWorkout } from '../engine/program.js';
import { say, onSpeaking, unlock } from '../coach/voice.js';
import { MOTIVATION_KEYS, lineFor } from '../data/voice-lines.js';
import { startWorkout } from './workout.js';
import { startRun, freeRun } from './run.js';
import { reminderPromptHtml, bindReminderPrompt } from './reminders-ui.js';
import { homeNextHtml, bindCalendar } from './calendar-ui.js';
import { nextPlanned, trainedToday } from '../engine/schedule.js';
import { reminders } from '../reminders.js';
import { backupDue, backupNow, snoozeBackup } from '../backup.js';

export function nextSession(s) {
  // האימון הפתוח הקרוב ביותר ביומן (אימון שבוטל לשבוע הזה לא נספר; אימון שהוזז מחכה למועד שלו)
  const now = new Date();
  return nextPlanned(s.plan, reminders().settings, now, trainedToday(s, now))?.session || null;
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
  const t = dayTargets(p, dayType(s, Date.now(), dd.dayType).type);   // יעד היום — כמו במסך התזונה
  const line = coachLine(s);
  const doneDays = new Set(s.plan.completedDays);
  const lastW = s.weights[s.weights.length - 1];
  const heroEx = ns?.items[0]?.exId || 'back_squat';

  const total = s.plan.week.sessions.length;
  const doneN = s.plan.week.sessions.filter((x) => doneDays.has(x.day)).length;
  const eaten = dayTotals(dd, p.customFoods);
  const pct = (v, of) => Math.min(100, Math.round((v / Math.max(1, of)) * 100));
  // כרטיס התזונה של היום: כמה נשאר, שלושת אבות המזון, והארוחה הבאה מהתפריט (אותו תפריט שבמסך התזונה)
  const nutCard = () => {
    const left = t.kcal - eaten.kcal, nf = (n) => Math.round(n).toLocaleString('he-IL');
    const plan = mealPlan(p, { ...menuToday(s, 'base'), t });   // אותו זרע, אותו יומן אחרון ואותן החלפות כמו במסך התזונה (25.11.2026)
    const h = new Date().getHours();
    const order = h < 10 ? ['breakfast', 'snack1', 'lunch'] : h < 12 ? ['snack1', 'lunch'] : h < 15 ? ['lunch', 'post', 'dinner'] : h < 18 ? ['post', 'dinner'] : ['dinner'];
    // כשנקבעו ימי אימון הארוחות מסודרות לפי שעת האימון של היום (orderMeals), ו"הארוחה הבאה" היא הראשונה שעוד לא עברה
    const mw = mealWindow(s); orderMeals(plan, mw);
    const nowMin = h * 60 + new Date().getMinutes();
    const meal = (mw ? plan.meals.find((m) => m.at + 90 > nowMin) : order.map((id) => plan.meals.find((m) => m.id === id)).find(Boolean)) || plan.meals[plan.meals.length - 1];
    const bar = (name, v, of, color) => `<div class="nh-m"><span><i>${name}</i><em><b class="num">${Math.round(v)}</b><small>/${of}</small></em></span><div class="bar"><i style="width:${pct(v, of)}%;background:${color}"></i></div></div>`;
    return html`<button class="card nut-home" data-act="nut">
      <div class="nh-top">${ring(Math.min(1, eaten.kcal / Math.max(1, t.kcal)), { size: 58, stroke: 6, big: pct(eaten.kcal, t.kcal) + '%' })}
        <div class="grow"><div class="eyebrow">${icon('food', 'width="14" height="14"')} התזונה של היום</div>
          <div class="nh-left">${left >= 0 ? `נשארו <b class="num">${nf(left)}</b> קק״ל` : `<b class="num">${nf(-left)}</b> קק״ל מעל היעד`}<small> מתוך ${nf(t.kcal)}</small></div>
          <div class="nh-macros">${bar('חלבון', eaten.p, t.protein, 'var(--pri)')}${bar('פחמימה', eaten.c, t.carbs, 'var(--acc)')}${bar('שומן', eaten.f, t.fat, 'var(--orange)')}</div></div></div>
      ${meal ? `<div class="nh-next"><span class="sub">הארוחה הבאה · ${meal.name}</span><b>${meal.dish ? esc(meal.dish.name) : meal.items.slice(0, 3).map((it) => esc(FOOD[it.id].name)).join(' · ')}</b><span class="chev">${icon('chev', 'width="16" height="16"')}</span></div>` : ''}
    </button>`;
  };
  const tile = (act, ic, val, unit, label, bar) => `<button class="card tight tracker" data-act="${act}"><div class="tr-top">${ic}<span class="tr-add">＋</span></div>
    <div class="v num">${val}<small> ${unit}</small></div><div class="sub t-cap">${label}</div>${bar != null ? `<div class="bar"><i style="width:${bar}%"></i></div>` : ''}</button>`;

  // מה שלא חייב להיות מול העיניים עבר לחלוניות: התראות ועדכונים (פעמון), ופירוט מדד הכושר (הקשה על השורה שלו)
  const promptsHtml = html`${reminderPromptHtml()}
    ${backupDue(s) && !reminderPromptHtml() ? html`<div class="card tight rem-prompt"><div class="row">${ib('save', 'acc', 'lg')}<div style="flex:1"><b>כדאי לגבות את הנתונים</b><div class="sub" style="font-size:13px">${s.sessions.length + s.runs.length} אימונים שמורים רק בטלפון הזה. ${s.lastBackupAt ? 'עבר חודש מהגיבוי האחרון.' : 'עדיין לא בוצע גיבוי.'}</div></div></div>
      <div class="row" style="margin-top:10px"><button class="btn sm primary" data-act="backup">גבה עכשיו</button><button class="btn sm ghost" data-act="backup-later">אחר כך</button></div></div>` : ''}`.trim();
  const eventsHtml = html`${s.events.length ? html`<div class="h2">עדכונים</div><div class="card tight list-hist">${s.events.slice(0, 3).map((e) => `<div class="it">${ib(e.type === 'pr' ? 'trophy' : e.type === 'rank' ? 'medal' : e.type === 'level' ? 'rocket' : 'chat', e.type === 'pr' || e.type === 'rank' ? 'pri' : 'acc')}<div><div style="font-weight:700;font-size:14px">${esc(e.text)}</div><div class="sub t-cap">${fmtDate(e.date)}</div></div></div>`)}</div>` : ''}`.trim();
  const fitHtml = html`<div class="card">
      <div class="cri">
        ${ring((cri.score ?? 0) / 100, { size: 104, stroke: 10, big: cri.score ?? '—', lbl: cri.score == null ? 'עוד לא נמדד' : 'מתוך 100' })}
        <div>
          ${meter('כוח', cri.parts.strength, 'אחרי אימון כוח')}${meter('סבולת', cri.parts.endurance, 'אחרי מבדק 3 ק״מ')}
          ${meter('עקביות', cri.parts.consistency)}${meter('גוף', cri.parts.body, 'אחרי שקילה שנייה')}
        </div>
      </div>
      <div class="rank-row"><span>${emi(rank.icon)} ${rank.name}</span><div class="bar"><i style="width:${rank.pct * 100}%"></i></div><span class="num">${rank.next ? `${s.xp} / ${rank.next.xp}` : s.xp} XP</span></div>
    </div>`;

  // מסך אחד, בלי גלילה: האימון הבא תופס את רוב המסך, ומתחתיו המאמן, המעקב היומי ומדד הכושר
  root.innerHTML = html`<div class="home">
    <div class="topbar">
      <div class="hello"><div class="sub">${greeting()}, ${esc(p.name)}</div>
        <a class="track-chip" href="#/coach" aria-label="התוכנית שלי"><img src="${coach.face}" alt=""><span>${'חדר כושר'}<small> · <span class="num">${total}</span> בשבוע</small></span>${icon('chev')}</a></div>
      <div class="top-actions">
        ${st ? `<span class="tag orange" title="רצף ימים">${icon('flame')} <span class="num">${st}</span></span>` : ''}
        <button class="set-btn bell" data-act="notices" aria-label="עדכונים">${icon('bell')}${promptsHtml ? '<i class="dot"></i>' : ''}</button>
        <a href="#/coach" class="set-btn" aria-label="הגדרות">${icon('gear')}<span>הגדרות</span></a>
      </div>
    </div>

    ${ns ? html`<div class="hero"><img class="bg" src="${demoPoster(p.coach, heroEx)}" alt="">
      <div class="hero-in"><div class="eyebrow">האימון הבא · ${esc(s.plan.week.phase.name)}</div>
        <div class="h1" style="font-size:24px">${esc(ns.name)}</div><div class="sub">${esc(ns.focus)}</div>
        <div class="stats"><div><b>${estMinutes(ns)}</b>דקות</div><div><b>${ns.items.length}</b>תרגילים</div>
          <div><b>${ns.items.reduce((a, b) => a + b.sets, 0)}</b>סטים</div>${ns.run ? `<div><b>+</b>ריצה</div>` : ''}</div>
        <button class="btn primary block xl" data-act="start">${icon('play', 'width="22" height="22"')} ${g('התחל', 'התחילי')} אימון</button>
        <div class="hero-sub">${ns?.run ? `<button class="btn sm" data-act="run">${icon('run', 'width="18" height="18"')} רק ריצה</button>` : ''}
      <button class="btn sm" data-act="field" ${ns?.run ? '' : 'style="grid-column:1/-1"'}>${icon('pack', 'width="18" height="18"')} אימון בלי ציוד</button></div>
        <div class="week-cap"><span>השבוע</span><span><span class="num">${doneN}</span> מתוך <span class="num">${total}</span> אימונים</span></div>
        <div class="week">${s.plan.week.sessions.map((x) => `<i class="d ${doneDays.has(x.day) ? 'done' : ns?.day === x.day ? 'next' : ''}"></i>`)}</div>
      </div></div>`
    : html`<div class="hero done"><div class="hero-in"><div class="e">${ib('trophy', 'pri', 'xl')}</div><div class="h1" style="font-size:24px">השבוע הושלם!</div><div class="sub">מנוחה — השבוע הבא נטען אוטומטית.</div>
        <div class="hero-sub">${ns?.run ? `<button class="btn sm" data-act="run">${icon('run', 'width="18" height="18"')} רק ריצה</button>` : ''}
      <button class="btn sm" data-act="field" ${ns?.run ? '' : 'style="grid-column:1/-1"'}>${icon('pack', 'width="18" height="18"')} אימון בלי ציוד</button></div></div></div>`}

    <div class="free-row"><button class="btn sm" data-act="free-run">${icon('run', 'width="18" height="18"')} ריצה חופשית</button></div>

    ${homeNextHtml()}

    <div class="card coach-hero">
      <div class="holo"><img src="${coach.face}" alt="${coach.name}"></div>
      <div class="bubble">${line.text}</div>
      <button class="speak" data-act="speak" data-key="${line.key}" aria-label="השמע את ${coach.name}"><span class="wave"><i></i><i></i><i></i><i></i></span></button>
    </div>

    ${wantsNutrition(p) ? nutCard() : ''}
    <div class="today">
      ${/* מעקב השתייה עבר למסך התזונה (החלטת בעל המוצר, 21.11.2026); כאן יבוא מונה צעדים כשתהיה אפליקציה מהחנות */''}
      ${tile('weight', ib('scale'), lastW ? lastW.kg : '—', 'ק״ג', 'משקל', null)}
      ${tile('checkin', ib('pulse', 'ok'), dd.checkin != null ? Math.round(dd.checkin * 100) : '—', dd.checkin != null ? '%' : '', 'מוכנות', dd.checkin != null ? Math.round(dd.checkin * 100) : null)}
      ${tile('fitness', ib('trophy', 'pri'), cri.score ?? '—', '', 'כושר', cri.score ?? null)}
    </div>

    </div>
  `;

  const off = onSpeaking((v) => root.querySelector('.speak')?.classList.toggle('speaking', v));
  root._cleanup = off;

  const rerender = () => renderHome(root);
  const act = (a, el) => {
    unlock();
    if (a === 'notices') {
      return sheet(`<div class="h1" style="font-size:22px">הודעות</div>${promptsHtml}${eventsHtml}${promptsHtml || eventsHtml ? '' : '<p class="sub">אין עדכונים חדשים.</p>'}<button class="btn block" style="margin-top:14px" data-close>סגור</button>`, {
        onMount(sh, close) {
          bindReminderPrompt(sh, () => { close(); rerender(); });
          on(sh, 'click', '[data-act], [data-remgo]', (ev, b) => { close(); if (b.dataset.act) act(b.dataset.act, b); });
        },
      });
    }
    if (a === 'fitness') return sheet(`<div class="h1" style="font-size:22px">הכושר שלך</div><p class="sub">הציון מורכב מהמדדים שכבר נמדדו.</p>${fitHtml}<a class="btn primary block" style="margin-top:14px" href="#/progress" data-close>להתקדמות המלאה</a><button class="btn ghost block" style="margin-top:8px" data-close>סגור</button>`);
    if (a === 'speak') say(el.dataset.key, { priority: true });
    if (a === 'start') checkIn((r) => startWorkout(ns, { readiness: r }));
    if (a === 'run') startRun(ns.run, { day: ns.day });
    if (a === 'free-run') startRun(freeRun());   // ריצה חופשית, בלי תוכנית
    if (a === 'field') checkIn((r) => startWorkout({ ...buildFieldWorkout(p), day: null, field: true }, { readiness: r }));
    if (a === 'food') location.hash = '#/nutrition';
    if (a === 'nut') { openNutritionTab('menu'); location.hash = '#/nutrition'; }
    if (a === 'weight') weightSheet(() => renderHome(root));
    if (a === 'backup') backupNow().then((ok) => { if (ok) toast('הגיבוי נשמר'); renderHome(root); });
    if (a === 'backup-later') { snoozeBackup(7); renderHome(root); }
    if (a === 'checkin') checkIn(() => renderHome(root), true);
  };
  bindCalendar(root, () => renderHome(root));
  on(root, 'click', '[data-act]', (e, el) => act(el.dataset.act, el));
}

// רכיב שעוד לא נמדד מוצג בלי מספר, עם הסבר מתי יופיע
const meter = (label, v, pending = '') => `<div class="meter"><div class="row"><span>${label}</span><span>${v ?? `<small>${pending}</small>`}</span></div><div class="bar"><i style="width:${v ?? 0}%"></i></div></div>`;

// צ׳ק־אין מוכנות לפני אימון → אוטו־רגולציה
export function checkIn(cb, onlyLog = false) {
  const existing = daily().checkin;
  if (existing != null && !onlyLog) return cb(existing);
  const q = { sleep: 3, energy: 3, soreness: 3, stress: 3 };
  const Q = [['sleep', 'איך ישנת?', [1, 2, 3, 4, 5]], ['energy', 'רמת אנרגיה', [1, 2, 3, 4, 5]],
    ['soreness', 'כאבי שרירים', [5, 4, 3, 2, 1]], ['stress', 'עומס בצבא / לחץ', [5, 4, 3, 2, 1]]];
  sheet(html`<div class="eyebrow">צ׳ק־אין לפני אימון</div><div class="h1" style="font-size:24px">${g('איך אתה מרגיש', 'איך את מרגישה')} היום?</div>
    <p class="sub">המאמן יתאים את עומס האימון למצב שלך — אחרי יום שטח קשה מורידים, ביום טוב מגבירים.</p>
    ${Q.map(([k, t, em]) => html`<div style="margin:14px 0 6px;font-weight:700">${t}</div>
      <div class="rpe" style="grid-template-columns:repeat(5,1fr)" data-q="${k}">${em.map((x, i) => `<button data-v="${i + 1}" class="${q[k] === i + 1 ? 'on' : ''}" aria-label="${i + 1} מתוך 5"><span>${icon(`face${x}`)}</span></button>`)}</div>`)}
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
        toast('המשקל נשמר');
        close(); cb?.();
      });
    },
  });
}
