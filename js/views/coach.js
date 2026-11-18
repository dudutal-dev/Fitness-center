// מסך המאמן והפרופיל: החלפת מאמן, הגדרות קול, עריכת פרופיל ויעדים, גיבוי ושחזור.
import { html, esc, on, sheet, toast, icon } from '../ui/dom.js';
import { get, set, regenerateWeek, exportData, importData, resetAll } from '../store.js';
import { COACHES } from '../data/coaches.js';
import { GOALS, INJURIES, LEVEL_NAMES } from '../engine/program.js';
import { runLevelFrom3k } from '../engine/running.js';
import { say, stop, unlock } from '../coach/voice.js';
import { parse3k } from './onboarding.js';
import { fmtTime } from '../ui/dom.js';
import { watchCard, bindWatchCard } from './garmin.js';
import { nameEntry } from '../data/names.js';
import { APP_VERSION } from '../version.js';
import { applyTheme } from '../theme.js';
import { reminderCard, bindReminders } from './reminders-ui.js';
import { syncReminders } from '../reminders.js';

// אילו סעיפי הגדרות פתוחים — נשמר בין רינדורים כדי שהסעיף לא ייסגר אחרי כל שינוי
const openSec = new Set();
const sec = (id, title, sub, body) => `<details class="card acc set-sec" data-sec="${id}" id="${id}" ${openSec.has(id) ? 'open' : ''}><summary><span class="grow"><b>${title}</b><span class="sub">${sub}</span></span></summary><div class="acc-body">${body}</div></details>`;

export function renderCoach(root) {
  const s = get();
  const p = s.profile;
  const st = s.settings;
  if (sessionStorage.getItem('scrollTo') === 'reminders') openSec.add('reminders');
  root.innerHTML = html`<div class="page-head"><div class="h1">המאמן וההגדרות</div></div>
    <div class="coach-pick">${Object.values(COACHES).map((c) => html`
      <button class="coach-card ${p.coach === c.id ? 'on' : ''}" data-coach="${c.id}"><img src="${c.img}" alt="${c.name}"><span class="check">✓</span>
        <div class="cap"><b>${c.name}</b><span>${c.title}</span></div></button>`)}</div>
    <p class="sub t-foot" style="margin-top:10px">${esc(COACHES[p.coach].bio)}</p>

    <div class="h2">הגדרות</div>
    ${sec('reminders', 'תזכורות', 'אימון, שתייה ושקילה', reminderCard())}
    ${sec('look', 'מראה', 'בהיר, כהה או לפי הטלפון', html`<div class="card"><div class="seg" data-theme-seg>
      ${[['dark', 'כהה'], ['light', 'בהיר'], ['auto', 'אוטומטי']].map(([k, t]) => `<button data-th="${k}" class="${(st.theme || 'dark') === k ? 'on' : ''}">${t}</button>`).join('')}</div>
      <div class="sub" style="font-size:12px;margin-top:8px">"אוטומטי" עובר לבד בין בהיר לכהה לפי הגדרות הטלפון. ההדגמות באימון נשארות על רקע כהה.</div></div>`)}
    ${sec('voice', 'קול והנחיות', 'ספירה, כתוביות ועוצמה', html`<div class="card">
      ${toggleRow('voice', 'הנחיות קוליות', 'המאמן מדבר, סופר ומעודד', st.voice)}
      ${toggleRow('tempoCount', 'ספירה מודרכת בטמפו', '"ירידה… עלייה!" וספירת כל חזרה', st.tempoCount)}
      ${toggleRow('warmup', 'חימום ומתיחות מודרכים', '5 תנועות חימום בהתחלה, מתיחות לפי השרירים בסוף', st.warmup !== false)}
      ${toggleRow('captions', 'כתוביות באימון', 'מה שהמאמן אומר — שורה קצרה שנעלמת', st.captions !== false)}
      <div style="margin-top:12px"><div class="row between"><b>עוצמה</b><span class="num sub">${Math.round(st.volume * 100)}%</span></div>
        <input type="range" min="0.2" max="1" step="0.05" value="${st.volume}" data-vol></div>
      <button class="btn sm teal block" style="margin-top:12px" data-test>${icon('play', 'width="16" height="16"')} בדיקת קול</button>
    </div>`)}
    ${sec('watch', 'Garmin ושעון חכם', 'דופק חי וייבוא פעילויות', watchCard())}
    ${sec('profile', 'פרופיל ויעדים', `${esc(GOALS[p.goal].name)} · ${p.days} אימונים בשבוע`, html`<div class="card">
      <label class="field"><span>המאמן פונה אליך בלשון</span><div class="seg" data-seg="sex">
        <button data-v="m" class="${p.sex !== 'f' ? 'on' : ''}">זכר</button><button data-v="f" class="${p.sex === 'f' ? 'on' : ''}">נקבה</button></div></label>
      <div class="sub" style="font-size:12px;margin:-6px 0 12px">${nameEntry(p) ? `ל${esc(COACHES[p.coach].name)} יש הקלטות שבהן ${p.coach === 'noa' ? 'היא קוראת' : 'הוא קורא'} לך "${esc(p.name)}"` : `אין עדיין הקלטה אישית לשם "${esc(p.name)}" — המאמן יפנה בלי שם. אפשר להוסיף שמות (tools/names)`}</div>
      <div class="grid2">
        ${field('name', 'שם', p.name, 'text')}${field('age', 'גיל', p.age)}
        ${field('heightCm', 'גובה (ס״מ)', p.heightCm)}${field('targetWeight', 'משקל יעד', p.targetWeight)}
      </div>
      <label class="field"><span>זמן 3 ק״מ אחרון</span><input class="input num" name="run3k" value="${p.run3k ? fmtTime(p.run3k) : ''}" placeholder="13:30"></label>
      <label class="field"><span>מטרה</span><div class="seg" data-seg="goal">${Object.entries(GOALS).map(([k, g]) => `<button data-v="${k}" class="${p.goal === k ? 'on' : ''}" aria-label="${g.name}">${icon(g.icon)}</button>`).join('')}</div>
        <div class="sub" style="font-size:12px;margin-top:4px">${GOALS[p.goal].name}</div></label>
      <label class="field"><span>אימונים בשבוע</span><div class="seg" data-seg="days">${[3, 4, 5, 6].map((v) => `<button data-v="${v}" class="${p.days === v ? 'on' : ''}">${v}</button>`).join('')}</div></label>
      <label class="field"><span>משך אימון</span><div class="seg" data-seg="sessionMin">${[45, 60, 75, 90].map((v) => `<button data-v="${v}" class="${p.sessionMin === v ? 'on' : ''}">${v}</button>`).join('')}</div></label>
      <label class="field"><span>פציעות / רגישויות</span><div class="chips">${Object.entries(INJURIES).map(([k, x]) => `<button class="chip no ${p.injuries.includes(k) ? 'on' : ''}" data-inj="${k}">${x.name}</button>`).join('')}</div></label>
      <button class="btn primary block" data-save>שמור ועדכן תוכנית</button>
      <div class="sub" style="font-size:12px;margin-top:8px">רמה נוכחית: ${p.level} (${LEVEL_NAMES[p.level]}) · שינוי מטרה/ימים בונה מחדש את השבוע הנוכחי.</div>
    </div>`)}

    <a class="card tight set-row" href="#/guide" style="margin-top:12px;text-decoration:none;color:inherit;border-bottom:0"><div class="grow"><b>מדריך שימוש</b><div class="sub">מה להגדיר ואיך מתאמנים עם המאמן</div></div><span class="chev">${icon('chev', 'width="20" height="20"')}</span></a>

    ${sec('data', 'נתונים וגיבוי', 'גיבוי, שחזור ואיפוס', html`<div class="card">
      <div class="sub" style="margin-bottom:10px">כל הנתונים נשמרים אוטומטית במכשיר. מומלץ לגבות מדי פעם (למשל לפני החלפת טלפון).</div>
      <div class="grid2"><button class="btn sm" data-export>${icon('download', 'width="16" height="16"')} גיבוי</button><label class="btn sm">${icon('upload', 'width="16" height="16"')} שחזור<input type="file" accept="application/json" hidden data-import></label></div>
      <button class="btn sm danger block" style="margin-top:10px" data-reset>איפוס מלא</button>
    </div>`)}
    <p class="sub" style="text-align:center;font-size:12px;margin-top:18px">LOHEM · גרסה <span class="num">${APP_VERSION}</span> · מתעדכנת אוטומטית · דמויות, הדמיות וקולות נוצרו ב-AI (ElevenLabs)<br>לפני תחילת תוכנית אימונים מומלץ אישור רפואי.</p>`;

  root.querySelectorAll('details[data-sec]').forEach((d) => d.addEventListener('toggle', () => { d.open ? openSec.add(d.dataset.sec) : openSec.delete(d.dataset.sec); }));
  bindWatchCard(root, () => renderCoach(root));
  bindReminders(root, () => renderCoach(root));
  if (sessionStorage.getItem('scrollTo') === 'reminders') { sessionStorage.removeItem('scrollTo'); setTimeout(() => root.querySelector('#reminders')?.scrollIntoView({ behavior: 'smooth' }), 100); }
  on(root, 'click', '[data-th]', (e, b) => { set((s2) => { s2.settings.theme = b.dataset.th; return s2; }); applyTheme(); renderCoach(root); });
  on(root, 'click', '[data-coach]', (e, b) => {
    unlock(); stop();
    set((s2) => { s2.profile.coach = b.dataset.coach; return s2; });
    say(`hello_${b.dataset.coach}`, { priority: true });
    syncReminders().catch(() => {});
    renderCoach(root);
  });
  on(root, 'click', '[data-toggle]', (e, b) => { const k = b.dataset.toggle; set((s2) => { s2.settings[k] = !(s2.settings[k] ?? true); return s2; }); document.body.classList.toggle('no-captions', get().settings.captions === false); if (k === 'voice') stop(); renderCoach(root); });
  root.querySelector('[data-vol]').addEventListener('change', (e) => set((s2) => { s2.settings.volume = Number(e.target.value); return s2; }));
  on(root, 'click', '[data-test]', () => { unlock(); say('m1', { priority: true }); });
  const draft = { goal: p.goal, days: p.days, sessionMin: p.sessionMin, injuries: [...p.injuries], sex: p.sex || 'm' };
  on(root, 'click', '[data-seg] button', (e, b) => {
    const k = b.closest('[data-seg]').dataset.seg;
    draft[k] = ['goal', 'sex'].includes(k) ? b.dataset.v : Number(b.dataset.v);
    b.parentElement.querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b));
  });
  on(root, 'click', '[data-inj]', (e, b) => { const i = draft.injuries.indexOf(b.dataset.inj); i >= 0 ? draft.injuries.splice(i, 1) : draft.injuries.push(b.dataset.inj); b.classList.toggle('on'); });
  on(root, 'click', '[data-save]', () => {
    const val = (n) => root.querySelector(`[name=${n}]`).value.trim();
    const r3 = val('run3k') ? parse3k(val('run3k')) : p.run3k;
    if (val('run3k') && !r3) return toast('פורמט זמן: 13:30');
    set((s2) => {
      Object.assign(s2.profile, draft, { name: val('name') || p.name, age: Number(val('age')) || p.age, heightCm: Number(val('heightCm')) || p.heightCm,
        targetWeight: Number(val('targetWeight')) || p.targetWeight, run3k: r3, runLevel: runLevelFrom3k(r3) });
      s2.plan.completedDays = s2.plan.completedDays.filter((d) => d <= s2.profile.days);
      return regenerateWeek(s2);
    });
    toast('הפרופיל והתוכנית עודכנו');
    syncReminders().catch(() => {});
    renderCoach(root);
  });
  on(root, 'click', '[data-export]', () => {
    const blob = new Blob([exportData()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `lohem-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  });
  root.querySelector('[data-import]').addEventListener('change', async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    try { importData(await f.text()); toast('הנתונים שוחזרו'); location.hash = '#/home'; } catch (err) { toast(`שגיאה: ${err.message}`); }
  });
  on(root, 'click', '[data-reset]', () => sheet(html`<div class="h1" style="font-size:22px">למחוק הכל?</div><p class="sub">כל האימונים, המדדים וההתקדמות יימחקו לצמיתות.</p>
    <button class="btn danger block" data-yes>כן, מחק הכל</button><button class="btn ghost block" style="margin-top:8px" data-close>ביטול</button>`, {
    onMount(sh, c) { sh.querySelector('[data-yes]').addEventListener('click', () => { c(); resetAll(); location.hash = ''; location.reload(); }); },
  }));
}

const toggleRow = (k, t, sub, v) => `<button class="set-row" data-toggle="${k}"><div class="grow"><b>${t}</b><div class="sub">${sub}</div></div><span class="sw ${v ? 'on' : ''}"><i></i></span></button>`;
const field = (n, label, v, type = 'number') => `<label class="field"><span>${label}</span><input class="input ${type === 'number' ? 'num' : ''}" name="${n}" type="${type}" value="${esc(v ?? '')}" ${type === 'number' ? 'inputmode="decimal"' : ''}></label>`;
