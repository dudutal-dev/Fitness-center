// אונבורדינג: 8 שלבים — מאמן, פרטים, מטרה, מבדק רמה, לו״ז, פציעות, תזונה, בניית תוכנית.
import { html, esc, on, $, toast, icon } from '../ui/dom.js';
import { COACHES } from '../data/coaches.js';
import { GOALS, INJURIES, estimateLevel, LEVEL_NAMES } from '../engine/program.js';
import { runLevelFrom3k } from '../engine/running.js';
import { DISLIKE_TAGS } from '../data/foods.js';
import { set, createPlan, today } from '../store.js';
import { say, unlock, stop } from '../coach/voice.js';

const GOAL_DESC = {
  combat: 'כוח + ריצה + סבולת שטח. מוכנות מלאה למסעות ולאימונים.',
  muscle: 'בניית מסת שריר ונפח, עם ריצה לשמירה על כושר.',
  strength: 'להרים כבד יותר — סקוואט, דדליפט, לחיצות.',
  cut: 'הורדת אחוזי שומן תוך שמירה על שריר וכוח.',
};

export function renderOnboarding(root, done) {
  const d = {
    coach: 'ori', name: '', age: 20, heightCm: 178, weightKg: 72, targetWeight: 75, sex: 'm',
    goal: 'combat', years: 1, pushups: 30, pullups: 8, run3kStr: '', days: 4, sessionMin: 60,
    injuries: [], dislikes: [], dislikedFoods: [],
  };
  let step = 0;
  const STEPS = 9;

  const views = [
    // 0 — פתיחה
    () => html`<div class="splash">
        <div class="duo"><img src="${COACHES.ori.img}" alt=""><img src="${COACHES.noa.img}" alt=""></div>
        <div class="copy">
          <div class="eyebrow">AI PERSONAL TRAINER</div>
          <div class="logo">LOHEM</div>
          <div class="h1" style="font-size:24px;margin-top:10px">מאמן אישי וירטואלי שבונה לוחם.</div>
          <p class="sub" style="font-size:15px">תוכנית אימונים שמשתנה איתך, ספירת חזרות וטמפו בקול, ריצה, תזונה ומעקב — הכל במקום אחד.</p>
        </div></div>`,
    // 1 — בחירת מאמן
    () => html`<div class="eyebrow">שלב 1 · המאמן שלך</div><div class="q">מי יאמן אותך?</div>
      <p class="sub">המאמן ילווה אותך בכל אימון: ידגים כל תרגיל, יספור חזרות, ימדוד מנוחות ויעודד. אפשר להחליף בכל רגע.</p>
      <div class="coach-pick">${Object.values(COACHES).map((c) => html`
        <button class="coach-card ${d.coach === c.id ? 'on' : ''}" data-coach="${c.id}">
          <img src="${c.img}" alt="${c.name}"><span class="check">✓</span>
          <div class="cap"><b>${c.name}</b><span>${c.title}</span></div></button>`)}</div>
      <p class="sub" style="margin-top:14px">${esc(COACHES[d.coach].bio)}</p>`,
    // 2 — פרטים
    () => html`<div class="eyebrow">שלב 2 · נכיר</div><div class="q">נעים להכיר</div>
      <label class="field"><span>המאמן יפנה אליך בלשון</span><div class="seg" data-seg="sex">
        <button data-v="m" class="${d.sex === 'm' ? 'on' : ''}">זכר</button><button data-v="f" class="${d.sex === 'f' ? 'on' : ''}">נקבה</button></div></label>
      <label class="field"><span>שם (המאמן יקרא לך בשם)</span><input class="input" name="name" value="${esc(d.name)}" placeholder="איך לקרוא לך?" autocomplete="given-name"></label>
      <div class="grid2">
        <label class="field"><span>גיל</span><input class="input num" name="age" type="number" inputmode="numeric" value="${d.age}"></label>
        <label class="field"><span>גובה (ס״מ)</span><input class="input num" name="heightCm" type="number" inputmode="numeric" value="${d.heightCm}"></label>
        <label class="field"><span>משקל נוכחי (ק״ג)</span><input class="input num" name="weightKg" type="number" inputmode="decimal" step="0.1" value="${d.weightKg}"></label>
        <label class="field"><span>משקל יעד (ק״ג)</span><input class="input num" name="targetWeight" type="number" inputmode="decimal" step="0.1" value="${d.targetWeight}"></label>
      </div>`,
    // 3 — מטרה
    () => html`<div class="eyebrow">שלב 3 · המטרה</div><div class="q">על מה עובדים?</div>
      ${Object.entries(GOALS).map(([id, g]) => html`<button class="goal-card ${d.goal === id ? 'on' : ''}" data-goal="${id}">
        <div class="gi">${icon(g.icon)}</div><div><b>${g.name}</b><span>${GOAL_DESC[id]}</span></div></button>`)}`,
    // 4 — מבדק רמה
    () => html`<div class="eyebrow">שלב 4 · מבדק רמה</div><div class="q">איפה ${d.sex === 'f' ? 'את עומדת' : 'אתה עומד'} היום?</div>
      <p class="sub">התשובות קובעות את רמת הקושי ההתחלתית (1–5). האפליקציה תעדכן אותה אוטומטית לפי הביצועים שלך.</p>
      <label class="field"><span>ניסיון בחדר כושר</span><div class="seg" data-seg="years">
        ${[[0, 'אין'], [0.5, 'חצי שנה'], [1, 'שנה+'], [3, '3 שנים+']].map(([v, t]) => `<button data-v="${v}" class="${d.years == v ? 'on' : ''}">${t}</button>`)}</div></label>
      <div class="grid2">
        <label class="field"><span>שכיבות סמיכה ברצף (מקס׳)</span><input class="input num" name="pushups" type="number" inputmode="numeric" value="${d.pushups}"></label>
        <label class="field"><span>עליות מתח ברצף (מקס׳)</span><input class="input num" name="pullups" type="number" inputmode="numeric" value="${d.pullups}"></label>
      </div>
      <label class="field"><span>זמן ריצת 3 ק״מ (דק:שנ׳) — אפשר להשאיר ריק</span><input class="input num" name="run3kStr" placeholder="למשל 13:30" value="${esc(d.run3kStr)}" inputmode="numeric"></label>`,
    // 5 — לו"ז
    () => html`<div class="eyebrow">שלב 5 · זמנים</div><div class="q">כמה ${d.sex === 'f' ? 'את יכולה' : 'אתה יכול'} להתאמן?</div>
      <label class="field"><span>אימונים בשבוע</span><div class="seg" data-seg="days">${[3, 4, 5, 6].map((v) => `<button data-v="${v}" class="${d.days == v ? 'on' : ''}">${v}</button>`)}</div></label>
      <label class="field"><span>משך אימון (דקות)</span><div class="seg" data-seg="sessionMin">${[45, 60, 75, 90].map((v) => `<button data-v="${v}" class="${d.sessionMin == v ? 'on' : ''}">${v}</button>`)}</div></label>
      <div class="card tight" style="margin-top:8px"><b>בצבא הלו״ז משתנה.</b><div class="sub">אין בעיה — האימונים לא צמודים לימים בשבוע. פשוט עושים את האימון הבא בתור. ואם אין חדר כושר, יש "אימון שטח" בלי ציוד.</div></div>`,
    // 6 — פציעות
    () => html`<div class="eyebrow">שלב 6 · בטיחות</div><div class="q">יש כאבים או פציעות?</div>
      <p class="sub">נחליף תרגילים שעלולים להחמיר. במקרה של כאב חד — לפנות לרופא היחידה.</p>
      <div class="chips">${Object.entries(INJURIES).map(([id, x]) => `<button class="chip no ${d.injuries.includes(id) ? 'on' : ''}" data-inj="${id}">${x.name}</button>`)}</div>
      <p class="sub" style="margin-top:14px">${d.injuries.length ? '' : 'אין פציעות — מצוין.'}</p>`,
    // 7 — תזונה
    () => html`<div class="eyebrow">שלב 7 · תזונה</div><div class="q">מה ${d.sex === 'f' ? 'את' : 'אתה'} <span style="color:var(--red)">לא</span> ${d.sex === 'f' ? 'אוכלת' : 'אוכל'}?</div>
      <p class="sub">${d.sex === 'f' ? 'סמני הכל — התפריט ייבנה רק ממה שאת כן אוכלת' : 'סמן הכל — התפריט ייבנה רק ממה שאתה כן אוכל'}, עם חלופות חכמות (למשל: לא אוכל ירקות? נשלים ויטמינים ממקורות אחרים).</p>
      <div class="chips">${Object.entries(DISLIKE_TAGS).map(([id, t]) => `<button class="chip no ${d.dislikes.includes(id) ? 'on' : ''}" data-dis="${id}">${t}</button>`)}</div>`,
    // 8 — בנייה
    () => html`<div class="build-anim"><div class="core"></div>
      <div class="h1" style="font-size:24px">${esc(COACHES[d.coach].name)} בונה לך תוכנית…</div>
      <ul id="buildList">
        <li>מנתח רמת כושר ויעדים</li><li>מתאים תרגילים למכשירים ולפציעות</li><li>בונה מחזור אימונים של 12 שבועות</li>
        <li>משלב תוכנית ריצה לשיפור 3 ק״מ</li><li>מחשב יעדי תזונה ותפריט</li></ul></div>`,
  ];

  function readInputs() {
    root.querySelectorAll('input[name]').forEach((i) => {
      d[i.name] = i.type === 'number' ? Number(i.value) : i.value.trim();
    });
  }

  function paint() {
    const isBuild = step === STEPS - 1;
    root.innerHTML = html`<div class="ob">
      ${step > 0 && !isBuild ? `<div class="steps">${Array.from({ length: STEPS - 2 }, (_, i) => `<i class="${i < step ? 'f' : ''}"></i>`).join('')}</div>` : ''}
      <div class="content">${views[step]()}</div>
      ${isBuild ? '' : html`<div class="actions">
        ${step > 0 ? '<button class="btn" data-act="back">חזרה</button>' : ''}
        <button class="btn primary block xl" data-act="next">${step === 0 ? 'בוא נתחיל' : step === STEPS - 2 ? 'בנה לי תוכנית' : 'המשך'}</button></div>`}
    </div>`;
    if (isBuild) runBuild();
  }

  on(root, 'click', '[data-act]', (e, t) => {
    unlock();
    readInputs();
    if (t.dataset.act === 'back') { step--; paint(); return; }
    if (step === 2 && !d.name) { toast('איך קוראים לך?'); return; }
    if (step === 4 && d.run3kStr && !parse3k(d.run3kStr)) { toast('פורמט זמן: דקות:שניות, למשל 13:30'); return; }
    step++; paint();
  });
  on(root, 'click', '[data-coach]', (e, t) => {
    unlock(); readInputs();
    d.coach = t.dataset.coach;
    set((s) => { s.profile = s.profile || {}; s.profile.coach = d.coach; return s; });
    stop(); say(`hello_${d.coach}`, { priority: true });
    paint();
  });
  on(root, 'click', '[data-goal]', (e, t) => { d.goal = t.dataset.goal; paint(); });
  on(root, 'click', '[data-seg] button', (e, t) => {
    readInputs();
    const v = t.dataset.v;
    d[t.closest('[data-seg]').dataset.seg] = Number.isNaN(Number(v)) ? v : Number(v);
    paint();
  });
  on(root, 'click', '[data-inj]', (e, t) => { toggle(d.injuries, t.dataset.inj); paint(); });
  on(root, 'click', '[data-dis]', (e, t) => { toggle(d.dislikes, t.dataset.dis); paint(); });

  function runBuild() {
    const items = [...root.querySelectorAll('#buildList li')];
    items.forEach((li, i) => setTimeout(() => li.classList.add('ok'), 450 * (i + 1)));
    setTimeout(() => {
      const run3k = parse3k(d.run3kStr);
      const level = estimateLevel({ years: d.years, pushups: d.pushups, pullups: d.pullups, run3k });
      const profile = {
        coach: d.coach, name: d.name, age: d.age, sex: d.sex, heightCm: d.heightCm, weightKg: d.weightKg, targetWeight: d.targetWeight,
        goal: d.goal, level, days: d.days, sessionMin: d.sessionMin, run3k, runLevel: runLevelFrom3k(run3k), injuries: d.injuries,
        dislikes: d.dislikes, dislikedFoods: [], createdAt: new Date().toISOString(),
      };
      set((s) => {
        s.profile = profile;
        s.plan = createPlan(profile);
        s.weights = [{ date: today(), kg: d.weightKg }];
        s.events = [{ type: 'coach', text: `התוכנית מוכנה! רמה ${level} — ${LEVEL_NAMES[level]}. ${GOALS[d.goal].name}.`, date: new Date().toISOString() }];
        return s;
      });
      done();
    }, 450 * (items.length + 1) + 300);
  }

  paint();
}

function toggle(arr, v) { const i = arr.indexOf(v); i >= 0 ? arr.splice(i, 1) : arr.push(v); }

export function parse3k(str) {
  if (!str) return null;
  const m = String(str).trim().match(/^(\d{1,2})[:.](\d{2})$/);
  if (!m) return null;
  const sec = Number(m[1]) * 60 + Number(m[2]);
  return sec >= 8 * 60 && sec <= 30 * 60 ? sec : null;
}
