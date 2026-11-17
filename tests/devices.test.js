import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deflateRawSync } from 'node:zlib';
import { parseFIT, decodeFIT } from '../js/devices/fit.js';
import { parseTCX, parseGPX, unzipFirst, parseByName, haversine } from '../js/devices/importer.js';
import { parseHR, parseRSC, zoneOf, maxHrFor, summarizeHR } from '../js/devices/hr.js';

// ───── מקודד FIT מינימלי לבדיקות ─────
function fitFile(messages) {
  const bytes = [];
  const u16 = (v) => [v & 255, v >> 8];
  const u32 = (v) => [v & 255, (v >> 8) & 255, (v >> 16) & 255, (v >>> 24) & 255];
  let local = 0;
  for (const m of messages) {
    // definition (little endian)
    bytes.push(0x40 | local, 0, 0, ...u16(m.num), m.fields.length);
    for (const [num, size, type] of m.fields) bytes.push(num, size, type);
    for (const row of m.rows) {
      bytes.push(local);
      m.fields.forEach(([, size], i) => bytes.push(...(size === 1 ? [row[i]] : size === 2 ? u16(row[i]) : u32(row[i]))));
    }
    local = (local + 1) % 16;
  }
  const header = [14, 0x20, ...u16(2132), ...u32(bytes.length), 46, 70, 73, 84, 0, 0];
  return new Uint8Array([...header, ...bytes, 0, 0]).buffer;
}

const T0 = 1100000000; // FIT time
const runFit = () => fitFile([
  { num: 0, fields: [[0, 1, 0x00], [4, 4, 0x86]], rows: [[4, T0]] },
  { num: 20, fields: [[253, 4, 0x86], [3, 1, 0x02], [5, 4, 0x86]], rows: [[T0, 120, 0], [T0 + 60, 150, 25000], [T0 + 120, 172, 50000]] },
  { num: 18, fields: [[253, 4, 0x86], [2, 4, 0x86], [5, 1, 0x00], [6, 1, 0x00], [7, 4, 0x86], [9, 4, 0x86], [11, 2, 0x84], [16, 1, 0x02], [17, 1, 0x02]],
    rows: [[T0 + 120, T0, 1, 0, 780000, 300000, 310, 158, 181]] },
]);

test('FIT: running session summary', () => {
  const a = parseFIT(runFit());
  assert.equal(a.sport, 'running');
  assert.equal(a.durationSec, 780);
  assert.equal(a.distanceKm, 3);
  assert.equal(a.avgHr, 158);
  assert.equal(a.maxHr, 181);
  assert.equal(a.calories, 310);
  assert.equal(a.hrSamples.length, 3);
  assert.equal(a.start, new Date((T0 + 631065600) * 1000).toISOString());
});

test('FIT: strength training sets + invalid values ignored', () => {
  const buf = fitFile([
    { num: 18, fields: [[2, 4, 0x86], [5, 1, 0x00], [6, 1, 0x00], [7, 4, 0x86], [9, 4, 0x86], [16, 1, 0x02]], rows: [[T0, 10, 20, 3600000, 0xffffffff, 0xff]] },
    { num: 225, fields: [[0, 4, 0x86], [3, 2, 0x84], [4, 2, 0x84], [5, 1, 0x02]], rows: [[40000, 8, 80 * 16, 1], [90000, 0, 0, 0], [35000, 10, 60 * 16, 1]] },
  ]);
  const a = parseFIT(buf);
  assert.equal(a.sport, 'strength');
  assert.equal(a.distanceKm, null);
  assert.equal(a.avgHr, null);
  assert.deepEqual(a.sets.map((s) => [s.reps, s.kg]), [[8, 80], [10, 60]]);
});

test('FIT: compressed timestamp header', () => {
  const header = [12, 0x10, 0, 0, 0, 0, 0, 0, 46, 70, 73, 84];
  const body = [0x40, 0, 0, 20, 0, 2, 253, 4, 0x86, 3, 1, 0x02, 0x00, 0x10, 0, 0, 0, 100,
    0x40 | 1, 0, 0, 20, 0, 1, 3, 1, 0x02, 0x80 | (1 << 5) | 0x13, 110];
  const bytes = new Uint8Array([...header, ...body]);
  new DataView(bytes.buffer).setUint32(4, body.length, true);
  const msgs = decodeFIT(bytes.buffer);
  assert.equal(msgs[1].fields[253], 0x13);
  assert.equal(msgs[1].fields[3], 110);
});

test('FIT: rejects non-FIT files', () => {
  assert.throws(() => parseFIT(new Uint8Array(20).buffer));
});

test('TCX parse', () => {
  const xml = `<?xml version="1.0"?><TrainingCenterDatabase><Activities><Activity Sport="Running"><Id>2026-11-10T17:00:00Z</Id>
    <Lap><TotalTimeSeconds>600</TotalTimeSeconds><DistanceMeters>2000</DistanceMeters><Calories>150</Calories>
    <MaximumHeartRateBpm><Value>175</Value></MaximumHeartRateBpm><Track>
    <Trackpoint><Time>2026-11-10T17:00:00Z</Time><HeartRateBpm><Value>140</Value></HeartRateBpm></Trackpoint>
    <Trackpoint><Time>2026-11-10T17:05:00Z</Time><HeartRateBpm><Value>160</Value></HeartRateBpm></Trackpoint></Track></Lap>
    <Lap><TotalTimeSeconds>300</TotalTimeSeconds><DistanceMeters>1000</DistanceMeters><Calories>80</Calories></Lap></Activity></Activities></TrainingCenterDatabase>`;
  const a = parseTCX(xml);
  assert.equal(a.sport, 'running'); assert.equal(a.durationSec, 900); assert.equal(a.distanceKm, 3);
  assert.equal(a.avgHr, 150); assert.equal(a.maxHr, 175); assert.equal(a.calories, 230);
});

test('GPX parse + haversine', () => {
  const xml = `<gpx><trk><type>running</type><trkseg>
    <trkpt lat="32.0000" lon="34.8000"><time>2026-11-10T17:00:00Z</time><extensions><gpxtpx:TrackPointExtension><gpxtpx:hr>130</gpxtpx:hr></gpxtpx:TrackPointExtension></extensions></trkpt>
    <trkpt lat="32.0090" lon="34.8000"><time>2026-11-10T17:05:00Z</time><extensions><gpxtpx:TrackPointExtension><gpxtpx:hr>150</gpxtpx:hr></gpxtpx:TrackPointExtension></extensions></trkpt>
    </trkseg></trk></gpx>`;
  const a = parseGPX(xml);
  assert.equal(a.durationSec, 300);
  assert.ok(Math.abs(a.distanceKm - 1.0) < 0.01, String(a.distanceKm));
  assert.equal(a.avgHr, 140);
  assert.ok(Math.abs(haversine({ lat: 0, lon: 0 }, { lat: 0, lon: 1 }) - 111195) < 50);
});

test('ZIP (Garmin "Export Original") with deflate', async () => {
  const data = new Uint8Array(runFit());
  const comp = deflateRawSync(data);
  const name = Buffer.from('12345_ACTIVITY.fit');
  const local = Buffer.alloc(30); local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(8, 8); local.writeUInt32LE(comp.length, 18); local.writeUInt32LE(data.length, 22); local.writeUInt16LE(name.length, 26);
  const central = Buffer.alloc(46); central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(8, 10); central.writeUInt32LE(comp.length, 20); central.writeUInt32LE(data.length, 24); central.writeUInt16LE(name.length, 28); central.writeUInt32LE(0, 42);
  const cdOff = local.length + name.length + comp.length;
  const eocd = Buffer.alloc(22); eocd.writeUInt32LE(0x06054b50, 0); eocd.writeUInt16LE(1, 8); eocd.writeUInt16LE(1, 10); eocd.writeUInt32LE(central.length + name.length, 12); eocd.writeUInt32LE(cdOff, 16);
  const zip = Buffer.concat([local, name, comp, central, name, eocd]);
  const inner = await unzipFirst(zip.buffer.slice(zip.byteOffset, zip.byteOffset + zip.length), /\.fit$/i);
  assert.equal(inner.name, '12345_ACTIVITY.fit');
  const a = parseByName(inner.name, inner.data);
  assert.equal(a.distanceKm, 3);
});

test('BLE heart rate + RSC parsing, zones', () => {
  assert.equal(parseHR(new DataView(new Uint8Array([0x00, 142]).buffer)), 142);
  assert.equal(parseHR(new DataView(new Uint8Array([0x01, 0x2c, 0x01]).buffer)), 300);
  const rsc = parseRSC(new DataView(new Uint8Array([0x03, 0x00, 0x03, 170, 0x64, 0x00, 0x10, 0x27, 0, 0]).buffer));
  assert.equal(rsc.speed, 3); assert.equal(rsc.cadence, 170); assert.equal(rsc.distM, 1000);
  assert.equal(maxHrFor({ age: 20 }), 194);
  assert.equal(zoneOf(175, 194).z, 5);
  assert.equal(zoneOf(120, 194).z, 2);
  const s = summarizeHR([{ t: 0, hr: 100 }, { t: 10000, hr: 180 }], null, 190);
  assert.equal(s.avg, 140); assert.equal(s.max, 180); assert.equal(s.zones[4], 10);
});
