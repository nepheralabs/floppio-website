import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createStorage, storageKey } from '../js/storage.js';
import { resetProgress, dailyResetTarget } from '../js/reset.js';
import { newState, begin, submit, advance, restoreState } from '../js/state.js';
import { View } from '../js/view.js';
import { shareText } from '../js/sharing.js';
const puzzle = JSON.parse(readFileSync(new URL('../puzzles/2026-11-01.json', import.meta.url), 'utf8'));
function setup() {
  const entries = new Map();
  const memory = { getItem: key => entries.get(key) ?? null,
    setItem: (key, value) => entries.set(key, value), removeItem: key => entries.delete(key) };
  return { entries, memory, storage: createStorage({ getStorage: () => memory }) };
}
function finish() {
  let state = newState(puzzle);
  for (let index = 0; index < 7; index++) {
    state = begin(state, 1000 + index * 30000);
    state = submit(state, puzzle, puzzle.prompts[index].answers[0].canonical, 2000 + index * 30000).state;
    state = advance(state);
  }
  return state;
}
test('sample reset requires confirmation and cancellation preserves the exact saved game', async () => {
  const { storage, entries } = setup();
  const completed = finish(); storage.write(puzzle, true, completed);
  const original = entries.get(storageKey(puzzle, true));
  let confirmation;
  assert.equal(await resetProgress({ storage, puzzle, sample: true, confirm: details => { confirmation = details; return false; } }), 'cancelled');
  assert.deepEqual(confirmation, { id: puzzle.id, sample: true, key: 'floppio:v1:sample:2026-11-01' });
  assert.equal(entries.get(storageKey(puzzle, true)), original);
  assert.equal(storage.read(puzzle, true).complete, true);
});
test('sample completion, reset and replay work three times without changing daily or unrelated storage', async () => {
  const { storage, entries } = setup();
  entries.set(storageKey(puzzle, false), 'daily sentinel');
  entries.set('other-app:settings', 'untouched');
  entries.set('floppio:v1:sample:2026-10-01', 'other sample');
  for (let run = 0; run < 3; run++) {
    assert.equal(storage.read(puzzle, true), null);
    const completed = finish(); assert.equal(completed.results.length, 7); assert.equal(completed.complete, true);
    storage.write(puzzle, true, completed);
    assert.deepEqual(storage.read(puzzle, true), completed);
    assert.equal(await resetProgress({ storage, puzzle, sample: true, confirm: () => true }), 'reset');
    assert.equal(entries.has(storageKey(puzzle, true)), false);
    assert.equal(entries.get(storageKey(puzzle, false)), 'daily sentinel');
    assert.equal(entries.get('other-app:settings'), 'untouched');
    assert.equal(entries.get('floppio:v1:sample:2026-10-01'), 'other sample');
    assert.deepEqual(restoreState(newState(puzzle), puzzle), newState(puzzle));
  }
});
test('daily reset clears only the confirmed current UTC key, including corrupt saves', async () => {
  const { storage, entries } = setup();
  const target = dailyResetTarget(Date.parse('2026-11-01T23:59:59Z'));
  entries.set(storageKey(target, false), '{corrupt');
  entries.set(storageKey(target, true), 'sample sentinel');
  entries.set('floppio:v1:daily:2026-10-31', 'previous daily');
  let details;
  assert.equal(await resetProgress({ storage, puzzle: target, sample: false, confirm: value => { details = value; return true; } }), 'reset');
  assert.equal(details.key, 'floppio:v1:daily:2026-11-01');
  assert.equal(entries.has(details.key), false);
  assert.equal(entries.get(storageKey(target, true)), 'sample sentinel');
  assert.equal(entries.get('floppio:v1:daily:2026-10-31'), 'previous daily');
  assert.equal(await resetProgress({ storage, puzzle: target, sample: false, confirm: () => true }), 'reset', 'clearing an absent key is harmless');
});
test('daily completion remains locked until explicit confirmed reset', async () => {
  const { storage } = setup();
  const completed = finish(); storage.write(puzzle, false, completed);
  const restored = storage.read(puzzle, false);
  assert.equal(restored.complete, true); assert.strictEqual(begin(restored, 900000), restored);
  assert.strictEqual(submit(restored, puzzle, 'France', 900001).state, restored);
  assert.equal(await resetProgress({ storage, puzzle, sample: false, confirm: () => false }), 'cancelled');
  assert.equal(storage.read(puzzle, false).complete, true);
  assert.equal(await resetProgress({ storage, puzzle, sample: false, confirm: () => true }), 'reset');
  const replay = begin(storage.read(puzzle, false) ?? newState(puzzle), 900000);
  assert.equal(replay.phase, 'active'); assert.equal(replay.index, 0); assert.equal(replay.deadline, 925000);
});
test('failed storage removal reports failure and preserves results', async () => {
  const { memory } = setup(); let warnings = 0;
  memory.removeItem = () => { throw new Error('SecurityError'); };
  const storage = createStorage({ getStorage: () => memory, onWarning: () => warnings++ });
  storage.write(puzzle, true, finish());
  assert.equal(await resetProgress({ storage, puzzle, sample: true, confirm: () => true }), 'failed');
  assert.equal(storage.read(puzzle, true).complete, true); assert.equal(warnings, 1);
  const blocked = createStorage({ getStorage: () => { throw new Error('blocked'); } });
  assert.equal(blocked.remove(puzzle, false), false);
});
test('reset scope must have an explicit mode and real date', async () => {
  const { storage } = setup();
  const confirm = () => { throw new Error('invalid scope must not reach confirmation'); };
  for (const [target, mode] of [[{ id: '../daily' }, true], [{ id: '2026-02-30' }, false], [null, true], [puzzle, undefined]]) {
    assert.equal(await resetProgress({ storage, puzzle: target, sample: mode, confirm }), 'invalid');
  }
  assert.deepEqual(dailyResetTarget(Date.parse('2026-11-02T00:00:00Z')), { id: '2026-11-02' });
});
test('sample controls are visible only after progress; daily screens never expose reset', () => {
  const root = { innerHTML: '', focus() {} }; const view = new View(root);
  const completed = finish();
  for (const state of [newState(puzzle), begin(newState(puzzle), 1000), completed]) {
    view.start(puzzle, state, false); assert.ok(!root.innerHTML.includes('id="reset-sample"'));
  }
  view.final(puzzle, completed, false, shareText(puzzle, completed));
  assert.ok(!root.innerHTML.includes('id="reset-sample"'));
  assert.ok(!root.innerHTML.includes('dev-reset'));
  view.start(puzzle, newState(puzzle), true); assert.ok(!root.innerHTML.includes('id="reset-sample"'));
  view.start(puzzle, begin(newState(puzzle), 1000), true); assert.ok(root.innerHTML.includes('RESET TEST GAME'));
  view.final(puzzle, completed, true, shareText(puzzle, completed, true));
  assert.ok(root.innerHTML.includes('PLAY SAMPLE AGAIN'));
});
