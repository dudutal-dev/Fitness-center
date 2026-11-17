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
