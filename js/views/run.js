// מצב ריצה חי: מקטעים (חימום/ספרינט/הליכה/טמפו), טיימר גדול, הנחיות קוליות ומבדק 3 ק״מ.
import { html, esc, on, sheet, toast, confetti, vibrate, icon, fmtTime, el } from '../ui/dom.js';
import { get, set, addXP, XP, pushEvent } from '../store.js';
import { COACHES, demoVideo, demoPoster } from '../data/coaches.js';
import { SEG_LABEL, fmtPace, runLevelFrom3k, next3kTarget } from '../engine/running.js';
import { say, stop, onSpeaking, unlock } from '../coach/voice.js';

const SEG_VOICE = { warm: 'run_warm', fast: 'run_fast', easy: 'run_easy', walk: 'run_walk', tempo: 'run_tempo', steady: 'run_steady', cool: 'run_cool', test: 'go' };

export function startRun(run, { day = null } = {}) {
  unlock();
  const s = get();
  const coach = s.profile.coach;
  const segs = run.segs;
  let i = 0;
  let segStart = 0;     // ms מצטבר של התחלת המקטע
  let elapsed = 0;      // ms
  let lastTick = Date.now();
  let paused = false;
  let timer = null;
  let wakeLock = null;
  let testStart = null;
  let saidHalf = false;
  const totalPlanned = segs.reduce((t, x) => t + x.sec, 0);
  try { navigator.wakeLock?.request('screen').then((l) => (wakeLock = l)).catch(() => {}); } catch { /* */ }

  const root = el(`<div class="live" role="dialog" aria-label="ריצה">
    <div class="stage" style="flex:0 0 38%"><img class="poster" src="${demoPoster(coach, 'treadmill_run')}" alt="">
      <video muted playsinline loop autoplay src="${demoVideo(coach, 'treadmill_run')}"></video>
      <div class="hud-top"><button class="icon-btn" data-act="exit">${icon('close', 'width="20" height="20"')}</button><span class="spacer"></span>
        <span class="clock num" id="tot">0:00</span></div>
      <div class="coach-pip"><img src="${COACHES[coach].face}" alt=""></div><div class="say"></div>
      <div class="title"><div class="eyebrow">${run.icon} ${esc(run.name)}</div><div class="name" style="font-size:24px">קצב יעד: <span class="num" id="pace"></span></div></div></div>
    <div class="panel" style="flex:1;display:flex;flex-direction:column">
      <div class="segs">${segs.map((x, j) => `<i class="${x.kind}" style="flex-grow:${Math.max(30, x.sec || 600)}" data-i="${j}"></i>`).join('')}</div>
      <div class="run-kind" id="kind"></div><div class="run-big" id="big">0:00</div><div class="sub" style="text-align:center" id="lbl"></div>
      <div class="spacer"></div>
      <div class="row" style="gap:10px;margin-top:12px">
        <button class="btn xl" style="flex:1" data-act="pause" id="pauseBtn">${icon('pause', 'width="22" height="22"')} השהה</button>
        <button class="btn xl" style="flex:1" data-act="skip">${icon('skip', 'width="22" height="22"')} דלג</button></div>
      <button class="btn primary block xl" style="margin-top:10px;display:none" data-act="test-done" id="testDone">🏁 סיימתי 3 ק״מ</button>
    </div></div>`);
  document.body.append(root);
  document.body.style.overflow = 'hidden';
  const $ = (q) => root.querySelector(q);
  $('video').addEventListener('error', (e) => (e.target.style.display = 'none'));
  const offSpeak = onSpeaking((v, text) => { $('.coach-pip').classList.toggle('speaking', v); if (v && text) $('.say').textContent = text; });

  function enterSeg() {
    const sg = segs[i];
    segStart = elapsed;
    root.querySelectorAll('.segs i').forEach((n, j) => { n.classList.toggle('cur', j === i); n.classList.toggle('past', j < i); });
    $('#kind').className = `run-kind ${sg.kind}`;
    $('#kind').textContent = SEG_LABEL[sg.kind];
    $('#lbl').textContent = sg.label;
    const p = run.pace;
    const pace = sg.kind === 'fast' ? p.fast : sg.kind === 'tempo' ? p.tempo : sg.kind === 'test' ? p.test : ['steady', 'easy'].includes(sg.kind) ? p.easy : null;
    $('#pace').textContent = pace ? `${fmtPace(pace)} לק״מ` : 'הליכה / קל';
    const isLastFast = sg.kind === 'fast' && !segs.slice(i + 1).some((x) => x.kind === 'fast');
    say(isLastFast ? 'run_last' : SEG_VOICE[sg.kind], { priority: true });
    if (sg.kind === 'test') { testStart = elapsed; $('#testDone').style.display = ''; $('[data-act="skip"]').style.display = 'none'; }
    else { $('#testDone').style.display = 'none'; $('[data-act="skip"]').style.display = ''; }
    vibrate([60, 40, 60]);
  }

  function tick() {
    const now = Date.now();
    if (!paused) elapsed += now - lastTick;
    lastTick = now;
    $('#tot').textContent = fmtTime(elapsed / 1000);
    const sg = segs[i];
    const inSeg = (elapsed - segStart) / 1000;
    if (sg.kind === 'test') { $('#big').textContent = fmtTime(inSeg); return; }
    const left = sg.sec - inSeg;
    $('#big').textContent = fmtTime(left);
    const secLeft = Math.ceil(left);
    if (secLeft !== tick.last) {
      tick.last = secLeft;
      if (secLeft === 60 && sg.sec >= 180) say('run_min');
      if (secLeft <= 3 && secLeft >= 1) say(`n${secLeft}`);
      if (!saidHalf && totalPlanned > 600 && elapsed / 1000 >= totalPlanned / 2) { saidHalf = true; say('run_half'); }
    }
    if (left <= 0) nextSeg();
  }

  function nextSeg() {
    if (i >= segs.length - 1) return finish();
    i++; enterSeg();
  }

  function finish(testSec = null) {
    clearInterval(timer);
    stop();
    say('run_done', { priority: true });
    confetti(90);
    const dur = Math.round(elapsed / 1000);
    $('.panel').innerHTML = html`<div class="h1" style="text-align:center;margin-top:8px">ריצה הושלמה 🏁</div>
      <div class="kpis" style="margin:14px 0"><div class="kpi"><b>${fmtTime(dur)}</b><span>זמן כולל</span></div>
        ${testSec ? `<div class="kpi up"><b>${fmtTime(testSec)}</b><span>3 ק״מ</span></div>` : '<div class="kpi"><b>' + segs.filter((x) => x.kind === 'fast').length + '</b><span>ספרינטים</span></div>'}
        <div class="kpi"><b>+${XP.run}</b><span>XP</span></div></div>
      <label class="field"><span>מרחק (ק״מ) — לא חובה</span><input class="input num" id="dist" type="number" step="0.1" inputmode="decimal" placeholder="למשל 5.2"></label>
      <div class="sub" style="margin-bottom:6px">כמה קשה היה?</div>
      <div class="rpe">${[['😎', 'קל', 6], ['💪', 'טוב', 7.5], ['😤', 'קשה', 9], ['🥵', 'מקסימום', 10]].map(([e, t, v]) => `<button data-rpe="${v}"><span>${e}</span>${t}</button>`).join('')}</div>`;
    on($('.panel'), 'click', '[data-rpe]', (e, b) => {
      const dist = Number($('#dist').value) || null;
      const st = get();
      const prev = st.runs.filter((r) => r.type === 'test' && r.timeSec).map((r) => r.timeSec);
      const isPR = testSec && (!prev.length || testSec < Math.min(...prev));
      set((s2) => {
        s2.runs.push({ date: new Date().toISOString(), type: run.type, name: run.name, durationSec: dur, distanceKm: dist, timeSec: testSec, rpe: Number(b.dataset.rpe), day });
        if (testSec) { s2.profile.run3k = testSec; s2.profile.runLevel = runLevelFrom3k(testSec); }
        return s2;
      });
      addXP(XP.run + (isPR ? XP.pr : 0), 'run');
      if (testSec) pushEvent({ type: isPR ? 'pr' : 'coach', text: `${isPR ? 'שיא חדש ב-3 ק״מ' : 'מבדק 3 ק״מ'}: ${fmtTime(testSec)}. היעד הבא: ${fmtTime(next3kTarget(testSec))}` });
      if (isPR) say('pr');
      toast('🏃 הריצה נשמרה');
      close();
    });
  }

  function close() {
    clearInterval(timer); offSpeak(); stop();
    try { wakeLock?.release(); } catch { /* */ }
    root.remove();
    document.body.style.overflow = '';
    dispatchEvent(new HashChangeEvent('hashchange'));
  }

  on(root, 'click', '[data-act]', (e, t) => {
    const a = t.dataset.act;
    if (a === 'pause') {
      paused = !paused;
      t.innerHTML = paused ? `${icon('play', 'width="22" height="22"')} המשך` : `${icon('pause', 'width="22" height="22"')} השהה`;
      paused ? $('video').pause() : $('video').play().catch(() => {});
    }
    if (a === 'skip') nextSeg();
    if (a === 'test-done') { const sec = Math.round((elapsed - testStart) / 1000); i = segs.length - 1; enterSeg(); setTimeout(() => finish(sec), 400); }
    if (a === 'exit') {
      sheet(html`<div class="h1" style="font-size:22px">לסיים את הריצה?</div>
        <button class="btn primary block" data-x="save">סיים ושמור</button>
        <button class="btn block" style="margin-top:8px" data-x="quit">צא בלי לשמור</button>
        <button class="btn ghost block" style="margin-top:8px" data-close>המשך לרוץ</button>`, {
        onMount(sh, c) { on(sh, 'click', '[data-x]', (ev, b) => { c(); b.dataset.x === 'save' ? finish() : close(); }); },
      });
    }
  });

  enterSeg();
  timer = setInterval(tick, 250);
}
