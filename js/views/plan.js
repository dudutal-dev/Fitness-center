// מסך התוכנית: מחזוריות בלוקים, אימוני השבוע עם משקלים מומלצים, ספריית תרגילים.
import { html, esc, on, sheet, toast } from '../ui/dom.js';
import { get, set, regenerateWeek } from '../store.js';
import { EX, EXERCISES, GROUPS } from '../data/exercises.js';
import { demoPoster } from '../data/coaches.js';
import { PHASES, WEEK_IN_BLOCK, GOALS, LEVEL_NAMES, phaseFor } from '../engine/program.js';
import { suggest } from '../engine/progression.js';
import { fmtTime } from '../ui/dom.js';
import { fmtPace } from '../engine/running.js';
import { startWorkout, infoSheet } from './workout.js';
import { startRun } from './run.js';
import { checkIn, estMinutes } from './home.js';
import { warmupFor, cooldownFor, blockedSet } from '../engine/program.js';

let libFilter = 'all';
let libAll = false;

export function renderPlan(root) {
  const s = get();
  const p = s.profile;
  const plan = s.plan;
  const doneDays = new Set(plan.completedDays);
  const blocks = [0, 1, 2].map((b) => phaseFor(p, Math.floor(plan.blockIndex / 3) * 3 + b));
  const curInCycle = plan.blockIndex % 3;
  const libList = EXERCISES.filter((e) => libFilter === 'all' || e.group === libFilter);

  root.innerHTML = html`
    <div class="page-head"><div class="eyebrow">תוכנית אימונים אדפטיבית</div>
    <div class="h1">${GOALS[p.goal].name}</div>
    <div class="row" style="margin-top:8px;flex-wrap:wrap;gap:6px">
      <span class="tag lime">רמה ${p.level} · ${LEVEL_NAMES[p.level]}</span><span class="tag">${p.days} אימונים בשבוע</span><span class="tag">${p.sessionMin} דק׳</span>
    </div></div>

    <div class="h2">מחזור 12 שבועות</div>
    <div class="phase-list">${blocks.map((ph, bi) => html`<div class="phase ${bi === curInCycle ? 'on' : ''}">
      <span class="bn">בלוק ${bi + 1}</span><span class="pn">${esc(ph.name)}</span>
      <div class="dots">${[0, 1, 2, 3].map((w) => `<i class="${bi < curInCycle || (bi === curInCycle && w < plan.weekInBlock) ? 'f' : bi === curInCycle && w === plan.weekInBlock ? 'c' : ''}"></i>`)}</div></div>`)}</div>
    <div class="card tight" style="margin-top:10px"><b>${esc(plan.week.phase.name)} · ${esc(plan.week.week.name)}</b>
      <div class="sub">${esc(plan.week.phase.desc)} ${plan.weekInBlock === 3 ? 'השבוע: פריקה — פחות נפח, גוף מתאושש וחוזר חזק יותר. + מבדק 3 ק״מ.' : `מאמץ יעד: RPE ${plan.week.week.rpe}.`}</div></div>

    <div class="h2">השבוע<span class="more" data-act="regen">בנה מחדש</span></div>
    ${plan.week.sessions.map((x) => html`<details class="card day ${doneDays.has(x.day) ? 'done' : ''}">
      <summary><div class="dn">${doneDays.has(x.day) ? '✓' : x.day}</div><div><b>${esc(x.name)}</b><div class="sub" style="font-size:13px">${esc(x.focus)} · ~${estMinutes(x)} דק׳ ${x.run ? `· ${x.run.icon} ${esc(x.run.name)}` : ''}</div></div></summary>
      <div class="content">
        ${x.items.map((it) => { const e = EX[it.exId]; const sg = suggest(it.exId, it, s.history[it.exId], p); return html`
          <div class="ex-row" data-info="${it.exId}"><div class="ex-thumb"><img src="${demoPoster(p.coach, it.exId)}" alt="" loading="lazy"></div>
            <div><div class="t">${esc(e.name)}</div><div class="s">${it.sets} × ${it.reps[0]}–${it.reps[1]}${it.unit === 'sec' ? ' שנ׳' : ''} · מנוחה ${fmtTime(it.rest)}</div></div>
            <div class="w">${sg.w ? `${sg.w}<small>ק״ג</small>` : '<small>משקל גוף</small>'}</div></div>`; })}
        ${s.settings.warmup !== false ? `<div class="mob-line"><span><b>חימום:</b> ${(x.warmup || warmupFor(x.items, blockedSet(p))).map((m) => EX[m.exId].name).join(' · ')}</span><span><b>מתיחות:</b> ${(x.cooldown || cooldownFor(x.items)).map((m) => EX[m.exId].name).join(' · ')}</span></div>` : ''}
        ${x.finisher ? `<div class="card tight" style="margin-top:10px"><b>${esc(x.finisher.name)}</b><div class="sub">${x.finisher.rounds} סבבים: ${x.finisher.items.map(([id, n]) => `${EX[id].name} ${n}${['time', 'cardio'].includes(EX[id].type) ? ' שנ׳' : ''}`).join(' + ')}</div></div>` : ''}
        ${x.run ? html`<div class="card tight" style="margin-top:10px"><div class="row"><b>${x.run.icon} ${esc(x.run.name)}</b><span class="spacer"></span><span class="tag teal">${x.run.type === 'test' ? 'מבדק' : `${Math.round(x.run.totalSec / 60)} דק׳`}</span></div>
          <div class="sub">${x.run.segs.filter((g) => !['warm', 'cool'].includes(g.kind)).slice(0, 1).map((g) => esc(g.label))} ${x.run.type === 'intervals' ? `· קצב ספרינט ${fmtPace(x.run.pace.fast)}/ק״מ` : x.run.type === 'tempo' ? `· קצב ${fmtPace(x.run.pace.tempo)}/ק״מ` : x.run.type === 'easy' ? `· קצב ${fmtPace(x.run.pace.easy)}/ק״מ` : ''}</div>
          <button class="btn sm teal" style="margin-top:8px" data-run="${x.day}">התחל ריצה</button></div>` : ''}
        <button class="btn primary block" style="margin-top:12px" data-start="${x.day}">${doneDays.has(x.day) ? 'בצע שוב' : 'התחל אימון'}</button>
      </div></details>`)}

    <div class="h2">רמת קושי</div>
    <div class="card"><b>רמה ${p.level} — ${LEVEL_NAMES[p.level]}</b><div class="sub t-foot">הרמה מתעדכנת אוטומטית בסוף כל בלוק לפי עקביות, התקדמות ומאמץ.</div>
      <div class="lvl-dots">${[1, 2, 3, 4, 5].map((l) => `<i class="${l <= p.level ? 'on' : ''}"></i>`).join('')}</div>
      <div class="grid2"><button class="btn sm" data-lvl="-1" ${p.level <= 1 ? 'disabled' : ''}>קל יותר</button><button class="btn sm" data-lvl="1" ${p.level >= 5 ? 'disabled' : ''}>קשה יותר</button></div></div>

    <div class="h2">ספריית תרגילים<span class="sub t-foot" style="margin-inline-start:auto">${libList.length} תרגילים</span></div>
    <div class="chips scroll" style="margin-bottom:12px">${[['all', 'הכל'], ...Object.entries(GROUPS)].map(([k, v]) => `<button class="chip ${libFilter === k ? 'on' : ''}" data-filter="${k}">${v}</button>`)}</div>
    <div class="lib">${libList.slice(0, libAll ? 999 : 6).map((e) => html`
      <button class="lib-card" data-info="${e.id}"><img src="${demoPoster(p.coach, e.id)}" alt="" loading="lazy"><div class="cap"><small>${GROUPS[e.group]}</small>${esc(e.name)}</div></button>`)}</div>
    ${libList.length > 6 ? `<button class="btn block mt-3" data-act="lib-all">${libAll ? 'הצג פחות' : `הצג את כל ${libList.length} התרגילים`}</button>` : ''}
  `;

  on(root, 'click', '[data-info]', (e, t) => infoSheet(t.dataset.info, p.coach));
  on(root, 'click', '[data-filter]', (e, t) => { libFilter = t.dataset.filter; libAll = false; renderPlan(root); });
  on(root, 'click', '[data-act="lib-all"]', () => { libAll = !libAll; renderPlan(root); });
  on(root, 'click', '[data-start]', (e, t) => { const ses = plan.week.sessions.find((x) => x.day === Number(t.dataset.start)); checkIn((r) => startWorkout(ses, { readiness: r })); });
  on(root, 'click', '[data-run]', (e, t) => { const ses = plan.week.sessions.find((x) => x.day === Number(t.dataset.run)); startRun(ses.run, { day: ses.day }); });
  on(root, 'click', '[data-act="regen"]', () => { set((s2) => regenerateWeek(s2)); toast('↻ השבוע נבנה מחדש'); renderPlan(root); });
  on(root, 'click', '[data-lvl]', (e, t) => {
    set((s2) => { s2.profile.level = Math.min(5, Math.max(1, s2.profile.level + Number(t.dataset.lvl))); return regenerateWeek(s2); });
    toast(`רמה ${get().profile.level} — התוכנית עודכנה`);
    renderPlan(root);
  });
}
