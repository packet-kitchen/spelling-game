import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  activityFor, applyOutcome, pickMissionWords, shouldRepeat, stageOf, startOfDay, MAX_LEVEL,
} from '../js/scheduler.js';

const DAY = 86400000;
const NOW = new Date('2026-11-19T17:00:00').getTime();

test('ladder: look -> missing -> tiles -> spell', () => {
  assert.equal(activityFor(0), 'look');
  assert.equal(activityFor(1), 'missing');
  assert.equal(activityFor(2), 'tiles');
  assert.equal(activityFor(3), 'spell');
  assert.equal(activityFor(7), 'spell');
});

test('a new word climbs one step per success', () => {
  let p = applyOutcome(undefined, 'look', 'first', NOW);
  assert.equal(p.level, 1);
  p = applyOutcome(p, 'missing', 'first', NOW);
  assert.equal(p.level, 2);
  p = applyOutcome(p, 'tiles', 'first', NOW);
  assert.equal(p.level, 3);
  p = applyOutcome(p, 'spell', 'first', NOW);
  assert.equal(p.level, 4);
  assert.equal(p.due, startOfDay(NOW) + DAY);
  assert.equal(p.seen, 4);
  assert.equal(p.right, 4);
});

test('spelling wrong drops back to letter tiles', () => {
  const p = applyOutcome({ level: 5, due: NOW - 1, seen: 3 }, 'spell', 'fail', NOW, { attempt: 'becos' });
  assert.equal(p.level, 2);
  assert.equal(p.lastWrong, 'becos');
  assert.equal(p.wrong, 1);
});

test('practising early does not skip the spacing', () => {
  const prev = { level: 4, due: NOW + DAY, seen: 4 };
  const p = applyOutcome(prev, 'spell', 'first', NOW);
  assert.equal(p.level, 4);
  assert.equal(p.due, prev.due);
  const q = applyOutcome({ level: 4, due: NOW - 1, seen: 4 }, 'spell', 'first', NOW);
  assert.equal(q.level, 5);
  assert.equal(q.due, startOfDay(NOW) + 3 * DAY);
});

test("this week's words come back at least daily", () => {
  const p = applyOutcome({ level: 5, due: NOW - 1, seen: 5 }, 'spell', 'first', NOW, { focus: true });
  assert.equal(p.level, 6);
  assert.equal(p.due, startOfDay(NOW) + DAY);
});

test('mastery and stages', () => {
  let p = { level: 6, due: NOW - 1, seen: 6 };
  p = applyOutcome(p, 'spell', 'first', NOW);
  assert.equal(p.level, MAX_LEVEL);
  assert.equal(stageOf(p), 'mastered');
  assert.equal(stageOf(undefined), 'new');
  assert.equal(stageOf({ level: 1, seen: 1 }), 'learning');
  assert.equal(stageOf({ level: 4, seen: 3 }), 'practising');
});

test('test results', () => {
  assert.equal(applyOutcome(undefined, 'test', 'right', NOW).level, 4);
  assert.equal(applyOutcome({ level: 5, due: NOW - 1, seen: 2 }, 'test', 'wrong', NOW).level, 2);
});

test('shouldRepeat gives learning words a second go', () => {
  assert.equal(shouldRepeat(1, 1), true);
  assert.equal(shouldRepeat(1, 2), false);
  assert.equal(shouldRepeat(4, 1), false);
});

const entry = (key, focus = false) => ({ key, text: key, focus });

test('mission picks focus words first and limits new words', () => {
  const entries = [
    ...['a1', 'a2', 'a3', 'a4', 'a5', 'a6'].map((k) => entry(k, true)),
    ...['b1', 'b2', 'b3', 'b4', 'b5', 'b6'].map((k) => entry(k)),
  ];
  const picked = pickMissionWords(entries, {}, NOW, 8, () => 0.5);
  assert.equal(picked.length, 8);
  // only 4 brand new words go in first, focus ones; the rest are extra new words to fill up
  assert.ok(['a1', 'a2', 'a3', 'a4'].every((k) => picked.some((e) => e.key === k)));
});

test('mission prefers learning and due words over new ones', () => {
  const entries = ['n1', 'n2', 'n3', 'l1', 'd1', 'm1'].map((k) => entry(k));
  const progress = {
    l1: { level: 2, seen: 2, due: NOW, lastSeen: NOW - DAY },
    d1: { level: 5, seen: 5, due: NOW - DAY, lastSeen: NOW - 3 * DAY },
    m1: { level: 7, seen: 9, due: NOW + 10 * DAY, lastSeen: NOW - 5 * DAY },
  };
  const picked = pickMissionWords(entries, progress, NOW, 3, () => 0.5).map((e) => e.key);
  assert.ok(picked.includes('l1'));
  assert.ok(picked.includes('d1'));
  assert.ok(!picked.includes('m1'));
});
