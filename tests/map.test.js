// מפת המסלול ורישום המסלול מה-GPS
import test from 'node:test';
import assert from 'node:assert/strict';
import { project, fitView } from '../js/ui/map.js';
import { simplifyPath } from '../js/devices/gps.js';

test('היטל המפה: מרכז העולם, ואריח ידוע של תל אביב', () => {
  assert.deepEqual(project(0, 0, 0), [128, 128]);
  const [x, y] = project(32.0853, 34.7818, 15);
  assert.deepEqual([Math.floor(x / 256), Math.floor(y / 256)], [19549, 13297]);
});
test('fitView: כל המסלול נכנס במסגרת, בזום הגבוה ביותר האפשרי', () => {
  const path = [[32.08, 34.78], [32.09, 34.79]], v = fitView(path, 390, 280);
  const a = project(32.09, 34.78, v.z), b = project(32.08, 34.79, v.z);
  assert.ok(b[0] - a[0] <= 390 - 56 && b[1] - a[1] <= 280 - 56);
  const a2 = project(32.09, 34.78, v.z + 1), b2 = project(32.08, 34.79, v.z + 1);
  assert.ok(b2[0] - a2[0] > 390 - 56 || b2[1] - a2[1] > 280 - 56);
  assert.equal(fitView([[32.08, 34.78], [32.08001, 34.78001]], 390, 280).z, 17);
});
test('המסלול לשמירה: עד 150 נקודות, מתחיל ונגמר באותן נקודות', () => {
  const p = [...Array(2000)].map((_, i) => [32 + i / 1e5, 34.7 + i / 2e5]), o = simplifyPath(p);
  assert.equal(o.length, 150); assert.deepEqual(o[0], [32, 34.7]); assert.deepEqual(o.at(-1), [32.01999, 34.71]);
  assert.deepEqual(simplifyPath([]), []); assert.equal(simplifyPath([[1, 2], [3, 4]]).length, 2);
  assert.ok(JSON.stringify(o).length < 3500);
});
