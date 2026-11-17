// Garmin: ייבוא פעילויות מקבצים, כרטיס הגדרות שעון, והוראות.
import { html, esc, on, sheet, toast, fmtTime, fmtDate } from '../ui/dom.js';
import { get, set, addXP, XP } from '../store.js';
import { importActivityFile } from '../devices/importer.js';
import { summarizeHR, maxHrFor, supported, isConnected, disconnect } from '../devices/hr.js';
import { connectWatch, watchStatusText, isIOS } from '../devices/ui.js';
import { fmtPace } from '../engine/running.js';
import { saveRun } from './run.js';

const SPORT_HE = { running: 'ריצה', strength: 'אימון כוח', cycling: 'אופניים', walking: 'הליכה', hiking: 'מסע / הליכה', training: 'אימון', fitness: 'כושר', swimming: 'שחייה', other: 'פעילות' };

export function pickAndImport(onDone) {
  const inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = '.fit,.tcx,.gpx,.zip,application/zip,application/octet-stream';
  inp.onchange = async () => {
    const f = inp.files[0];
    if (!f) return;
    try {
      const a = await importActivityFile(f);
      previewSheet(a, onDone);
    } catch (e) { toast(`לא הצלחתי לקרוא את הקובץ: ${e.message}`, 4500); }
  };
  inp.click();
}

function previewSheet(a, onDone) {
  const s = get();
  const dup = s.runs.some((r) => r.importId === a.start) || s.sessions.some((x) => x.importId === a.start);
  const pace = a.distanceKm ? a.durationSec / a.distanceKm : null;
  const sameDay = s.sessions.filter((x) => x.date.slice(0, 10) === a.start.slice(0, 10) && !x.imported);
  const looksTest = a.sport === 'running' && a.distanceKm >= 2.9 && a.distanceKm <= 3.3;
  const hr = a.hrSamples?.length ? summarizeHR(a.hrSamples, null, maxHrFor(s.profile)) : a.avgHr ? { avg: a.avgHr, max: a.maxHr, zones: [0, 0, 0, 0, 0], samples: [] } : null;
  const vol = a.sets.reduce((t, x) => t + (x.kg || 0) * (x.reps || 0), 0);
  sheet(html`<div class="eyebrow">⌚ ייבוא מ-Garmin</div><div class="h1" style="font-size:24px">${SPORT_HE[a.sport] || 'פעילות'} · ${fmtDate(a.start)}</div>
    ${dup ? '<div class="tag orange" style="margin:6px 0">⚠️ הפעילות הזו כבר יובאה</div>' : ''}
    <div class="kpis" style="margin:14px 0">
      <div class="kpi"><b>${fmtTime(a.durationSec)}</b><span>זמן</span></div>
      <div class="kpi"><b>${a.distanceKm ?? '—'}</b><span>ק״מ</span></div>
      <div class="kpi"><b>${pace ? fmtPace(pace) : a.calories ?? '—'}</b><span>${pace ? 'קצב לק״מ' : 'קלוריות'}</span></div></div>
    ${a.avgHr || hr ? `<div class="card tight"><b>❤ דופק ממוצע ${hr?.avg ?? a.avgHr} · מקסימום ${hr?.max ?? a.maxHr}</b>${a.calories ? `<div class="sub">🔥 ${a.calories} קלוריות</div>` : ''}</div>` : ''}
    ${a.sets.length ? `<div class="card tight" style="margin-top:10px"><b>🏋️ ${a.sets.length} סטים</b><div class="sub">${a.sets.reduce((t, x) => t + (x.reps || 0), 0)} חזרות · ${Math.round(vol)} ק״ג נפח</div></div>` : ''}
    <div class="stack" style="margin-top:16px">
      ${a.sport === 'strength' && sameDay.length ? `<button class="btn primary block" data-imp="attach">צרף דופק לאימון "${esc(sameDay[sameDay.length - 1].name)}"</button>` : ''}
      ${a.sport === 'strength' ? '<button class="btn block" data-imp="session">שמור כאימון כוח</button>' : ''}
      ${looksTest ? '<button class="btn primary block" data-imp="test">🏁 שמור כמבדק 3 ק״מ</button>' : ''}
      ${a.sport !== 'strength' ? `<button class="btn ${looksTest ? '' : 'primary'} block" data-imp="run">שמור כ${a.sport === 'running' ? 'ריצה' : 'פעילות אירובית'}</button>` : ''}
      <button class="btn ghost block" data-close>ביטול</button>
    </div>`, {
    onMount(sh, close) {
      on(sh, 'click', '[data-imp]', (e, b) => {
        const k = b.dataset.imp;
        const name = a.sport === 'running' ? 'ריצה (Garmin)' : `${SPORT_HE[a.sport] || 'פעילות'} (Garmin)`;
        if (k === 'run' || k === 'test') {
          saveRun({ date: a.start, type: k === 'test' ? 'test' : a.sport === 'running' ? 'garmin' : 'cardio', name: k === 'test' ? 'מבדק 3 ק״מ (Garmin)' : name,
            durationSec: a.durationSec, distanceKm: a.distanceKm, timeSec: k === 'test' ? a.durationSec : null, rpe: null, hr, calories: a.calories, source: 'garmin', importId: a.start });
        } else if (k === 'attach') {
          const target = sameDay[sameDay.length - 1];
          set((st) => { const x = st.sessions.find((y) => y.date === target.date); Object.assign(x, { hr, calories: a.calories, importId: a.start }); return st; });
          toast('❤ הדופק צורף לאימון');
        } else if (k === 'session') {
          set((st) => {
            st.sessions.push({ date: a.start, name: 'אימון כוח (Garmin)', day: null, field: false, imported: true, durationSec: a.durationSec, volume: Math.round(vol),
              setsDone: a.sets.length, exercises: [], prs: [], hr, calories: a.calories, source: 'garmin', importId: a.start });
            return st;
          });
          addXP(XP.workout, 'import');
          toast('🏋️ האימון נשמר');
        }
        close(); onDone?.();
      });
    },
  });
}

export function garminHelp() {
  sheet(html`<div class="eyebrow">⌚ Garmin</div><div class="h1" style="font-size:24px">איך מחברים את השעון</div>
    <div class="h2">1 · דופק חי באימון ובריצה</div>
    <div class="tip"><div class="ti">📡</div><div><b>הפעלת שידור דופק בשעון</b><span>בשעון: לחיצה ארוכה על MENU → הגדרות → בריאות ובריאות גופנית / דופק משורש כף היד → <b>שידור דופק (Broadcast Heart Rate)</b>. בחלק מהדגמים: מתוך פעילות → הגדרות → "שידור בזמן פעילות".</span></div></div>
    <div class="tip"><div class="ti">🔗</div><div><b>חיבור לאפליקציה</b><span>בטלפון: "חבר שעון" → לבחור את השעון מהרשימה. עובד ב-Chrome באנדרואיד. גם רצועת חזה (HRM-Pro/Dual) עובדת, וחלקן משדרות גם מהירות ומרחק.</span></div></div>
    ${isIOS() ? '<div class="tip"><div class="ti">🍏</div><div><b>באייפון</b><span>ספארי לא תומך ב-Bluetooth מהדפדפן. לדופק חי: להתקין את הדפדפן החינמי <b>Bluefy</b> ולפתוח בו את האפליקציה. כל השאר (GPS, ייבוא) עובד גם בספארי.</span></div></div>' : ''}
    <div class="h2">2 · מרחק וקצב בריצה</div>
    <div class="tip"><div class="ti">🛰️</div><div><b>GPS של הטלפון</b><span>מופעל אוטומטית במצב ריצה (לאשר הרשאת מיקום). במבדק 3 ק״מ המאמן מזהה לבד את סוף ה-3 ק״מ. להשאיר את המסך דלוק.</span></div></div>
    <div class="h2">3 · ייבוא אימונים מ-Garmin Connect</div>
    <div class="tip"><div class="ti">⬇️</div><div><b>ייצוא מהאתר</b><span>connect.garmin.com → פעילות → ⚙️ (גלגל שיניים) → <b>Export Original</b> (קובץ ZIP), או Export to TCX/GPX. ואז כאן: "ייבוא מ-Garmin" ולבחור את הקובץ.</span></div></div>
    <div class="tip"><div class="ti">📈</div><div><b>מה נכנס</b><span>זמן, מרחק, קצב, דופק ממוצע/מקסימלי ואזורי דופק, קלוריות. ריצות נכנסות לגרפים ולמדד הכשירות; ריצת ~3 ק״מ אפשר לשמור כמבדק. באימוני כוח — סטים, חזרות ומשקלים.</span></div></div>
    <button class="btn block" style="margin-top:14px" data-close>הבנתי</button>`);
}

export function watchCard() {
  const p = get().profile;
  return html`<div class="card">
    <div class="row between"><div><b>⌚ שעון / חיישן דופק</b><div class="sub" style="font-size:13px">${watchStatusText()}</div></div>
      ${isConnected() ? '<button class="btn sm danger" data-w="off">נתק</button>' : supported() ? '<button class="btn sm teal" data-w="on">חבר שעון</button>' : '<span class="tag">לא נתמך בדפדפן</span>'}</div>
    ${!supported() ? `<div class="sub" style="font-size:12px;margin-top:8px">${isIOS() ? 'באייפון: לדופק חי פתח את האפליקציה בדפדפן Bluefy. GPS וייבוא עובדים כרגיל.' : 'לדופק חי נדרש Chrome (אנדרואיד/מחשב).'}</div>` : ''}
    <div class="grid2" style="margin-top:12px">
      <label class="field" style="margin:0"><span>דופק מקסימלי</span><input class="input num" data-maxhr type="number" inputmode="numeric" value="${maxHrFor(p)}"></label>
      <div class="sub" style="font-size:12px;align-self:end">ברירת מחדל: 208 − 0.7×גיל. אם ידוע לך מהשעון — עדכן.</div>
    </div>
    <div class="grid2" style="margin-top:12px"><button class="btn sm" data-w="import">⬇ ייבוא מ-Garmin</button><button class="btn sm ghost" data-w="help">❓ איך מחברים</button></div>
  </div>`;
}

export function bindWatchCard(root, rerender) {
  on(root, 'click', '[data-w]', async (e, b) => {
    const k = b.dataset.w;
    if (k === 'on') { await connectWatch(); rerender(); }
    if (k === 'off') { disconnect(); rerender(); }
    if (k === 'import') pickAndImport(rerender);
    if (k === 'help') garminHelp();
  });
  root.querySelector('[data-maxhr]')?.addEventListener('change', (e) => {
    const v = Number(e.target.value);
    if (v >= 150 && v <= 230) set((s) => { s.profile.maxHr = v; return s; });
  });
}
