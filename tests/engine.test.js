import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildWeek, buildWorkout, applyReadiness, estimateLevel, blockedSet } from '../js/engine/program.js';
import { suggest, e1rm, evaluateLevel, isPR } from '../js/engine/progression.js';
import { targets, mealPlan } from '../js/engine/nutrition.js';
import { FOOD } from '../js/data/foods.js';
import { buildRunSession, runLevelFrom3k } from '../js/engine/running.js';
import { combatReadiness, rankFor, readinessScore, streak } from '../js/engine/stats.js';
import { EX, EXERCISES } from '../js/data/exercises.js';
import { VOICE_LINES } from '../js/data/voice-lines.js';

const P = { name: 'דוד', age: 20, sex: 'm', heightCm: 178, weightKg: 72, goal: 'combat', level: 3, days: 4, sessionMin: 60, run3k: 13 * 60, injuries: [], dislikes: ['vegetables'], dislikedFoods: [] };

test('every exercise referenced exists and has cues', () => {
  for (const e of EXERCISES) assert.ok(e.cues.length >= 3 || e.cues.length >= 2, e.id);
  for (const days of [3, 4, 5, 6]) {
    const w = buildWeek({ ...P, days });
    assert.equal(w.sessions.length, days);
    for (const s of w.sessions) for (const it of s.items) assert.ok(EX[it.exId], it.exId);
  }
});

test('combat goal schedules 3 runs, deload week has a 3k test', () => {
  const w = buildWeek(P);
  assert.equal(w.sessions.filter((s) => s.run).length, 3);
  const d = buildWeek(P, { weekInBlock: 3 });
  assert.ok(d.sessions.some((s) => s.run?.type === 'test'));
});

test('injuries block exercises', () => {
  const p = { ...P, injuries: ['knee', 'back'] };
  const blocked = blockedSet(p);
  for (const days of [3, 4, 5, 6]) for (const s of buildWeek({ ...p, days }).sessions)
    for (const it of s.items) assert.ok(!blocked.has(it.exId), `${it.exId} should be blocked`);
});

test('session length caps exercises', () => {
  const long = buildWorkout('upperB', { ...P, sessionMin: 90 });
  const short = buildWorkout('upperB', { ...P, sessionMin: 40 });
  assert.ok(short.items.length < long.items.length);
});

test('readiness low reduces sets and load', () => {
  const w = buildWorkout('lowerA', P);
  const low = applyReadiness(w, 0.2);
  assert.ok(low.items.every((it, i) => it.sets <= w.items[i].sets && it.loadAdj === 0.9));
});

test('double progression: hits top → weight up; fails hard → weight down', () => {
  const item = { reps: [8, 10] };
  const hist = [{ date: '2026-11-01', target: [8, 10], sets: [1, 2, 3].map(() => ({ w: 60, reps: 10, rpe: 8, done: true })) }];
  const up = suggest('back_squat', item, hist, P);
  assert.equal(up.w, 65); assert.ok(up.up);
  const bad = [{ date: '2026-11-01', target: [8, 10], sets: [{ w: 60, reps: 6, rpe: 10, done: true }, { w: 60, reps: 5, rpe: 10, done: true }] }];
  const down = suggest('back_squat', item, bad, P);
  assert.ok(down.w < 60 && down.down);
  const first = suggest('bench_press', item, [], P);
  assert.ok(first.w >= 20 && first.first);
});

test('PR detection and e1rm', () => {
  assert.equal(Math.round(e1rm(100, 5)), 117);
  const h = [{ sets: [{ w: 80, reps: 5, done: true }] }];
  assert.ok(isPR('bench_press', [{ w: 85, reps: 5, done: true }], h));
  assert.ok(!isPR('bench_press', [{ w: 75, reps: 5, done: true }], h));
});

test('level evaluation', () => {
  assert.equal(evaluateLevel(3, { planned: 16, completed: 15, progressed: 6, tracked: 10, avgRpe: 8 }).level, 4);
  assert.equal(evaluateLevel(3, { planned: 16, completed: 5, progressed: 1, tracked: 10, avgRpe: 8 }).level, 2);
  assert.equal(estimateLevel({ years: 0, pushups: 10, pullups: 0 }), 1);
  assert.ok(estimateLevel({ years: 4, pushups: 60, pullups: 18, run3k: 11 * 60 }) >= 5);
});

test('nutrition respects dislikes and targets', () => {
  const t = targets(P);
  assert.ok(t.kcal > 2500 && t.kcal < 4000, String(t.kcal));
  assert.equal(t.protein, 144);
  for (let seed = 1; seed < 20; seed++) {
    const plan = mealPlan({ ...P, dislikes: ['vegetables', 'fish', 'dairy'] }, { seed });
    for (const m of plan.meals) for (const it of m.items) {
      const f = FOOD[it.id];
      assert.ok(!f.tags.some((x) => ['vegetables', 'fish', 'dairy'].includes(x)), f.id);
    }
    assert.ok(plan.noVeg);
    assert.ok(Math.abs(plan.total.kcal - t.kcal) / t.kcal < 0.35, `seed ${seed}: ${plan.total.kcal} vs ${t.kcal}`);
  }
});

test('running sessions progress', () => {
  assert.equal(runLevelFrom3k(11 * 60), 5);
  assert.equal(runLevelFrom3k(17 * 60), 1);
  const a = buildRunSession(P, 'intervals', 0), b = buildRunSession(P, 'intervals', 6);
  assert.ok(b.totalSec > a.totalSec);
});

test('stats', () => {
  assert.equal(rankFor(0).name, 'טירון');
  assert.equal(rankFor(700).name, 'לוחם');
  assert.ok(readinessScore({ sleep: 5, energy: 5, soreness: 1, stress: 1 }) === 1);
  const cri = combatReadiness({ profile: P, history: {}, sessions: [], runs: [], weights: [] });
  assert.ok(cri.score > 0 && cri.score < 100);
  const d = (n) => new Date(Date.now() - n * 864e5).toISOString();
  assert.equal(streak([{ date: d(0) }, { date: d(2) }, { date: d(3) }]), 3);
});

test('voice lines exist for every exercise', () => {
  for (const e of EXERCISES) assert.ok(VOICE_LINES[`ex_${e.id}`]);
});

test('every voice clip (incl. female + names) exists on disk', async () => {
  const { manifest } = await import('../tools/voice_manifest.mjs');
  const { existsSync } = await import('node:fs');
  const { FEMALE, VOICE_LINES } = await import('../js/data/voice-lines.js');
  for (const k of Object.keys(FEMALE)) assert.ok(VOICE_LINES[k], `female variant without base: ${k}`);
  const missing = Object.keys(manifest()).filter((k) => !existsSync(new URL(`../assets/voice/${k}.mp3`, import.meta.url)));
  assert.deepEqual(missing, []);
});

test('release version is consistent (version.json / js/version.js / sw.js)', async () => {
  const { readFileSync } = await import('node:fs');
  const { APP_VERSION } = await import('../js/version.js');
  const vj = JSON.parse(readFileSync(new URL('../version.json', import.meta.url)));
  const sw = readFileSync(new URL('../sw.js', import.meta.url), 'utf8');
  assert.equal(vj.v, APP_VERSION);
  assert.ok(sw.includes(`lohem-${APP_VERSION}`));
  assert.ok(sw.includes(`lohem-media-${vj.media}`));
});

test('demo timing: every rep-based exercise video has rep segments for both coaches', async () => {
  const { DEMO_TIMING } = await import('../js/data/demo-timing.js');
  for (const e of EXERCISES) {
    if (['time', 'cardio'].includes(e.type)) continue;
    for (const c of ['ori', 'noa']) {
      const segs = DEMO_TIMING[c][e.id].segs;
      assert.ok(segs.length >= 1, `${c}/${e.id}`);
      for (const [a, t, b] of segs) assert.ok(a < t && t < b && b <= 4.01, `${c}/${e.id} ${a},${t},${b}`);
    }
  }
});

test('edit/delete workouts keeps progression history consistent', async () => {
  const { updateSession, deleteSession, updateRun, deleteRun } = await import('../js/engine/history-edit.js');
  const d1 = '2026-11-10T18:00:00.000Z', d2 = '2026-11-12T18:00:00.000Z';
  const st = {
    xp: 500, profile: { run3k: 800 }, plan: { weekStart: '2026-11-11', completedDays: [1, 2] },
    sessions: [
      { id: 's1', date: d1, day: 1, exercises: [{ exId: 'bench_press', role: 'main', target: [8, 10], sets: [{ w: 60, reps: 10, done: true }, { w: 60, reps: 9, done: true }] }] },
      // אימון ישן בלי מזהה — הקישור לפי זמן
      { date: d2, day: 2, exercises: [{ exId: 'bench_press', role: 'main', target: [8, 10], sets: [{ w: 62.5, reps: 8, done: true }] }, { exId: 'back_squat', role: 'main', target: [8, 10], sets: [{ w: 80, reps: 8, done: true }] }] },
    ],
    history: {
      bench_press: [{ sid: 's1', date: d1, sets: [{ w: 60, reps: 10 }, { w: 60, reps: 9 }] }, { date: '2026-11-12T18:00:01.000Z', sets: [{ w: 62.5, reps: 8 }] }],
      back_squat: [{ date: '2026-11-12T18:00:01.000Z', sets: [{ w: 80, reps: 8 }] }],
    },
    runs: [{ date: d1, type: 'test', timeSec: 800 }, { date: d2, type: 'test', timeSec: 760 }],
  };
  // עריכה: תיקון משקל ומחיקת סט
  updateSession(st, 0, { exercises: [{ exId: 'bench_press', role: 'main', target: [8, 10], sets: [{ w: 65, reps: 10, done: true }] }] });
  assert.equal(st.history.bench_press.length, 2);
  assert.deepEqual(st.history.bench_press.find((h) => h.sid === 's1').sets.map((x) => x.w), [65]);
  assert.equal(st.sessions[0].volume, 650);
  assert.equal(st.sessions[0].setsDone, 1);
  // מחיקה של אימון ישן (בלי מזהה): ההיסטוריה שלו נמחקת, יום 2 בשבוע הנוכחי חוזר להיות פתוח, XP יורד
  deleteSession(st, 1);
  assert.equal(st.sessions.length, 1);
  assert.equal(st.history.bench_press.length, 1);
  assert.equal(st.history.back_squat, undefined);
  assert.deepEqual(st.plan.completedDays, [1]);
  assert.equal(st.xp, 380);
  // ריצות: מחיקת המבדק האחרון מחזירה את זמן ה-3 ק״מ הקודם
  deleteRun(st, 1);
  assert.equal(st.profile.run3k, 800);
  updateRun(st, 0, { timeSec: 790 });
  assert.equal(st.profile.run3k, 790);
});

test('warm-up and targeted stretches per workout', async () => {
  const { warmupFor, cooldownFor, buildWorkout } = await import('../js/engine/program.js');
  const legs = buildWorkout('lowerA', P), upper = buildWorkout('upperA', P);
  assert.equal(legs.warmup.length, 5);
  assert.ok(legs.warmup.some((x) => x.exId === 'bw_squat'));
  assert.ok(upper.warmup.some((x) => x.exId === 'high_knees'));
  assert.ok(legs.cooldown.some((x) => ['quad_stretch', 'hamstring_stretch'].includes(x.exId)));
  assert.ok(upper.cooldown.some((x) => ['chest_stretch', 'shoulder_stretch'].includes(x.exId)));
  for (const w of [legs, upper]) {
    assert.equal(w.cooldown[w.cooldown.length - 1].exId, 'child_pose');
    for (const m of [...w.warmup, ...w.cooldown]) assert.equal(EX[m.exId].group, 'mobility');
    for (const it of w.items) assert.notEqual(EX[it.exId].group, 'mobility');
  }
  // פציעת ברכיים: בלי קפיצות בחימום
  const knee = warmupFor(buildWorkout('lowerA', { ...P, injuries: ['knee'] }).items, new Set(['box_jump']));
  assert.ok(!knee.some((x) => ['jumping_jacks', 'high_knees'].includes(x.exId)));
});

test('food database: every item has a MoH source, sane values, search and day totals', async () => {
  const { searchFoods, dayTotals } = await import('../js/engine/nutrition.js');
  const { FOODS, FOOD } = await import('../js/data/foods.js');
  assert.ok(FOODS.length >= 150);
  for (const f of FOODS) {
    assert.ok(Array.isArray(f.src) && f.src.length && f.src.every((x) => Number.isInteger(x.code) && x.g > 0), `${f.id} has no source`);
    assert.ok(f.g > 0 && f.kcal >= 0 && Array.isArray(f.meals) && f.meals.length, f.id);
    // אנרגיה ממאקרו (4/4/9 + סיבים 2) קרובה לערך האנרגיה במאגר — פער גדול = טעות מיפוי או פריט חשוד במאגר.
    const est = f.p * 4 + f.c * 4 + f.f * 9 + (f.fib || 0) * 2;
    if (f.kcal > 40) assert.ok(Math.abs(est - f.kcal) / f.kcal < 0.15, `${f.id}: ${f.kcal} vs ${Math.round(est)}`);
  }
  assert.ok(searchFoods('שניצל').some((f) => f.id === 'schnitzel_pita'));
  assert.ok(searchFoods('קוטג').length >= 2);
  assert.equal(searchFoods('', [], { cat: 'meal' }).every((f) => f.cat === 'meal'), true);
  const custom = [{ id: 'c_1', name: 'חטיף של עומר', kcal: 100, p: 10, c: 10, f: 2, custom: true }];
  assert.equal(searchFoods('עומר', custom)[0].id, 'c_1');
  const t = dayTotals({ foods: [{ id: 'banana', qty: 2 }, { id: 'c_1', qty: 1 }], protein: 20 }, custom);
  assert.equal(t.kcal, Math.round(FOOD.banana.kcal * 2 + 100 + 80));
});

test('meal plan: no chicken / meat / fish at breakfast; foods fit their meal; no junk in plan', async () => {
  const { mealPlan } = await import('../js/engine/nutrition.js');
  const { FOOD } = await import('../js/data/foods.js');
  const MEAT = ['chicken', 'red_meat', 'fish', 'tuna'];
  const code = { breakfast: 'b', snack1: 's', lunch: 'l', post: 'p', dinner: 'd' };
  for (const ctx of ['base', 'field', 'home']) for (let seed = 1; seed <= 60; seed++) {
    const plan = mealPlan({ ...P, dislikes: [] }, { ctx, seed });
    for (const m of plan.meals) for (const it of m.items) {
      const f = FOOD[it.id];
      assert.ok(f.meals.includes(code[m.id]), `${f.name} not allowed in ${m.id}`);
      assert.notEqual(f.cat, 'meal');
      if (m.id === 'breakfast') assert.ok(!f.tags.some((t) => MEAT.includes(t)), `breakfast has ${f.name} (${ctx}, seed ${seed})`);
    }
  }
});


// ───── תזונה: התאמה למחקר ─────
test('menu hits the calorie and protein targets it prescribes', async () => {
  const { mealPlan } = await import('../js/engine/nutrition.js');
  const profiles = [
    { weightKg: 78, heightCm: 178, age: 24, sex: 'm', goal: 'combat', days: 4 },
    { weightKg: 78, heightCm: 178, age: 24, sex: 'm', goal: 'muscle', days: 5 },
    { weightKg: 95, heightCm: 178, age: 30, sex: 'm', goal: 'cut', days: 3 },
    { weightKg: 60, heightCm: 165, age: 22, sex: 'f', goal: 'cut', days: 3 },
  ];
  for (const base of profiles) for (const ctx of ['base', 'field', 'home']) for (let seed = 1; seed <= 12; seed++) {
    const plan = mealPlan({ ...base, dislikes: [], dislikedFoods: [] }, { ctx, seed });
    const t = plan.targets;
    assert.ok(Math.abs(plan.total.kcal / t.kcal - 1) <= 0.12, `kcal ${plan.total.kcal} vs ${t.kcal} (${base.goal}/${ctx}/${seed})`);
    assert.ok(plan.total.p >= t.protein * 0.85, `protein ${plan.total.p} vs ${t.protein} (${base.goal}/${ctx}/${seed})`);
    for (const m of plan.meals) for (const it of m.items) assert.ok(it.qty >= 0.5 && it.qty <= 2.5);
  }
});

test('targets: activity derives from training days, protein is capped for high BMI, floors hold', async () => {
  const { targets, activityKey, goalDelta } = await import('../js/engine/nutrition.js');
  assert.equal(activityKey({ days: 2 }), 'light');
  assert.equal(activityKey({ days: 4 }), 'base');
  assert.equal(activityKey({ days: 6 }), 'training');
  assert.equal(activityKey({ days: 2, activityLevel: 'field' }), 'field');
  const heavy = targets({ weightKg: 130, heightCm: 180, age: 35, sex: 'm', goal: 'cut', days: 3 });
  assert.ok(heavy.protein < 130 * 2.2 && heavy.protein === Math.round(30 * 1.8 * 1.8 * 2.2));
  const lean = targets({ weightKg: 75, heightCm: 180, age: 25, sex: 'm', goal: 'cut', days: 4 });
  assert.equal(lean.protein, Math.round(75 * 2.2));
  assert.ok(lean.kcal >= lean.bmr && lean.fat >= 0.5 * 75);
  assert.equal(lean.fiber, Math.round(lean.kcal / 1000 * 14));
  const surplus = goalDelta('muscle', 78, 2900);
  assert.ok(surplus >= 250 && surplus <= 450);
  assert.equal(targets({ weightKg: 75, heightCm: 180, age: 25, sex: 'm', goal: 'combat', days: 4, kcalAdjust: 150 }).kcal - targets({ weightKg: 75, heightCm: 180, age: 25, sex: 'm', goal: 'combat', days: 4 }).kcal, 150);
});

test('trendAdvice compares the real weight trend with the recommended rate', async () => {
  const { trendAdvice } = await import('../js/engine/nutrition.js');
  const now = new Date('2026-11-18').getTime();
  assert.equal(trendAdvice([{ date: '2026-11-10', kg: 80 }, { date: '2026-11-17', kg: 79.5 }], { goal: 'cut' }, now), null);
  const w = (kgs) => kgs.map((kg, i) => ({ date: `2026-11-${String(1 + i * 5).padStart(2, '0')}`, kg }));
  const ok = trendAdvice(w([80, 79.7, 79.4, 79.1]), { goal: 'cut' }, now);   // ~-0.42 ק״ג/שבוע ≈ -0.53%
  assert.ok(ok.onTrack && ok.step === 0);
  const fast = trendAdvice(w([80, 79, 78, 77]), { goal: 'cut' }, now);        // ~-1.75%/שבוע
  assert.equal(fast.step, 150);
  const stuck = trendAdvice(w([80, 80.1, 80, 80.1]), { goal: 'cut' }, now);
  assert.equal(stuck.step, -150);
  assert.equal(trendAdvice(w([80, 80.1, 80, 80.1]), { goal: 'cut', kcalAdjust: -450 }, now).step, 0);
});

test('no-equipment workout uses only bodyweight exercises, for every level and injury', async () => {
  const { buildFieldWorkout, isBodyweight, INJURIES } = await import('../js/engine/program.js');
  for (let level = 1; level <= 5; level++) for (const injuries of [[], ...Object.keys(INJURIES).map((k) => [k])]) {
    const w = buildFieldWorkout({ ...P, level, injuries });
    assert.ok(w.items.length >= 3, `too few exercises (level ${level}, ${injuries})`);
    for (const it of w.items) assert.ok(isBodyweight(it.exId), `${it.exId} needs equipment (level ${level}, ${injuries})`);
    for (const [id] of w.finisher?.items || []) assert.ok(isBodyweight(id), `finisher ${id} needs equipment`);
    const main = new Set(w.items.map((it) => it.exId));
    for (const m of w.warmup) assert.ok(!main.has(m.exId), `warm-up repeats ${m.exId}`);
  }
});

test('weekSummary compares the last 7 days with the 7 before', async () => {
  const { weekSummary } = await import('../js/engine/summary.js');
  const now = new Date(2026, 10, 18, 12).getTime(), d = (n) => new Date(now - n * 864e5).toISOString();
  const key = (n) => { const x = new Date(now - n * 864e5); return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`; };
  const state = {
    profile: { ...P, customFoods: [] }, plan: { week: { sessions: [1, 2, 3, 4] } },
    sessions: [{ date: d(0), durationSec: 3000, volume: 5000, prs: ['bench_press'] }, { date: d(2), durationSec: 2400, volume: 4000, prs: [] }, { date: d(6), durationSec: 2400, volume: 3000 },
      { date: d(8), durationSec: 2400, volume: 2000, prs: [] }, { date: d(20), durationSec: 2400, volume: 9000 }],
    runs: [{ date: d(1), durationSec: 1500, distanceKm: 4.2 }, { date: d(9), durationSec: 1200, distanceKm: 3 }],
    daily: { [key(0)]: { foods: [{ id: 'chicken_breast', qty: 2 }], water: 2000 }, [key(1)]: { foods: [{ id: 'chicken_breast', qty: 1 }], water: 1000 }, [key(9)]: { foods: [{ id: 'rice', qty: 1 }] } },
    weights: [{ date: key(10), kg: 73 }, { date: key(3), kg: 72.4 }],
  };
  const s = weekSummary(state, now);
  assert.equal(s.cur.workouts, 3); assert.equal(s.prev.workouts, 1);
  assert.equal(s.cur.runs, 1); assert.equal(s.cur.runKm, 4.2);
  assert.equal(s.cur.volume, 12000); assert.equal(s.cur.prs, 1); assert.equal(s.cur.activeDays, 4);
  assert.equal(s.cur.foodDays, 2); assert.equal(s.cur.kcal, Math.round((480 + 240) / 2)); assert.equal(s.cur.waterL, 1.5);
  assert.deepEqual(s.weight, { kg: 72.4, delta: -0.6 });
  assert.ok(s.verdict.length > 5);
  const empty = weekSummary({ profile: P, sessions: [], runs: [], daily: {}, weights: [] }, now);
  assert.equal(empty.cur.workouts, 0); assert.equal(empty.cur.kcal, null); assert.equal(empty.weight, null);
});
