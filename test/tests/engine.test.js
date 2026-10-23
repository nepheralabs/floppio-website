import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validatePuzzle } from '../js/validation.js';
import { loadPuzzle } from '../js/puzzles.js';
import { normalize, matchAnswer } from '../js/matching.js';
import { newState, begin, submit, skip, expire, advance, restoreState } from '../js/state.js';
import { createStorage, storageKey } from '../js/storage.js';
import { shareText, shareResults } from '../js/sharing.js';
import { totalScore } from '../js/scoring.js';
import { remainingMs } from '../js/timing.js';
import { utcDate, DURATION_MS } from '../js/config.js';
const puzzle = JSON.parse(readFileSync(new URL('../puzzles/2026-11-01.json', import.meta.url), 'utf8').replace(/^\uFEFF/, ''));
const fresh = () => structuredClone(puzzle);
const active = () => begin(newState(puzzle), 1000);
const response = data => async () => ({ ok: true, json: async () => data });
const memory = () => { const entries = new Map(); return { getItem: k => entries.get(k) ?? null, setItem: (k,v) => entries.set(k,v) }; };

test('valid seven-prompt sample and matching requested date load', async () => {
  assert.equal(validatePuzzle(puzzle, puzzle.id).prompts.length, 7);
  assert.equal((await loadPuzzle({ date: puzzle.id, sample: true, fetcher: response(puzzle) })).ok, true);
});
test('malformed puzzle variants are rejected', () => {
  const edits = [p => p.prompts.pop(), p => p.prompts.push(p.prompts[0]), p => p.prompts[0].answers[0].score = -1,
    p => p.prompts[0].answers[0].score = 1.5, p => p.prompts[1].id = p.prompts[0].id,
    p => p.prompts[0].answers[1].aliases.push('France'), p => p.prompts[0].answers[0].aliases = null,
    p => p.prompts[0].answers = [], p => p.date = '2026-02-30', p => p.schemaVersion = 2,
    p => delete p.sample, p => p.prompts[0].question = '', p => p.prompts[0].answers[0].canonical = '!!!'];
  for (const edit of edits) { const p = fresh(); edit(p); assert.throws(() => validatePuzzle(p)); }
  assert.throws(() => validatePuzzle(null));
  assert.throws(() => validatePuzzle(puzzle, '2026-10-22'));
});
test('case, whitespace, punctuation and Unicode accents normalize', () => {
  assert.equal(normalize('  CÔTE   D’IVOIRE!  '), 'cote divoire');
  assert.equal(matchAnswer('   BÉLGIUM! ', puzzle.prompts[0]).answer.canonical, 'Belgium');
  assert.equal(matchAnswer('Twenty-nine', puzzle.prompts[5]).answer.canonical, '29');
});
test('aliases score immediately', () => {
  assert.equal(matchAnswer('  the   czech republic ', puzzle.prompts[0]).kind, 'exact');
  assert.equal(matchAnswer('meter', puzzle.prompts[4]).answer.canonical, 'Metre');
});
test('Belguim is a suggestion and cannot score until canonical confirmation', () => {
  const state = active();
  const attempt = submit(state, puzzle, 'Belguim', 1500);
  assert.equal(attempt.match.kind, 'suggestion'); assert.equal(attempt.match.answer.canonical, 'Belgium');
  assert.strictEqual(attempt.state, state); assert.equal(totalScore(attempt.state), 0);
  assert.equal(submit(attempt.state, puzzle, attempt.match.answer.canonical, 1600).state.results[0].score, 65);
});
test('ambiguous fuzzy candidates and alias candidates are rejected', () => {
  const prompt = { answers: [{ canonical: 'catapult', score: 10, aliases: ['cater'] }, { canonical: 'caper', score: 20, aliases: [] }] };
  assert.equal(matchAnswer('caler', prompt).kind, 'ambiguous');
});
test('short answers, numbers, disabled fuzzy, and distant errors are not suggested', () => {
  for (const [text, prompt] of [['Mar', puzzle.prompts[1]], ['28', puzzle.prompts[5]], ['tweny nine', puzzle.prompts[5]], ['Bxlgiom', puzzle.prompts[0]], ['', puzzle.prompts[0]], ['x'.repeat(121), puzzle.prompts[0]]]) {
    assert.equal(matchAnswer(text, prompt).kind, 'invalid');
  }
});
test('only one valid answer scores and editorial points ignore speed', () => {
  const quick = submit(active(), puzzle, 'Belgium', 2000).state;
  const slow = submit(active(), puzzle, 'Belgium', 25000).state;
  assert.equal(totalScore(quick), 65); assert.equal(totalScore(slow), 65);
  assert.equal(quick.results[0].timeMs, 1000); assert.equal(slow.results[0].timeMs, 24000);
  assert.strictEqual(submit(quick, puzzle, 'Luxembourg', 3000).state, quick);
  assert.strictEqual(skip(quick, puzzle, 3000), quick); assert.equal(quick.results.length, 1);
});
test('skip awards zero with measured time', () => {
  const state = skip(active(), puzzle, 1234);
  assert.deepEqual(state.results[0], { promptId: puzzle.prompts[0].id, status: 'skipped', answer: null, score: 0, timeMs: 234 });
});
test('deadline wins over submit, suggestion confirmation, and skip', () => {
  for (const state of [expire(active(), puzzle, 26000), submit(active(), puzzle, 'Belgium', 26000).state, skip(active(), puzzle, 50000)]) {
    assert.equal(state.results[0].status, 'timeout'); assert.equal(totalScore(state), 0); assert.equal(state.results[0].timeMs, DURATION_MS);
  }
  const attempt = submit(active(), puzzle, 'Belguim', 25999);
  assert.equal(submit(attempt.state, puzzle, attempt.match.answer.canonical, 26000).state.results[0].status, 'timeout');
});
test('refresh preserves active deadline and expires overdue question', () => {
  const original = active(); const restored = restoreState(JSON.parse(JSON.stringify(original)), puzzle);
  assert.equal(restored.deadline, 26000); assert.strictEqual(begin(restored, 20000), restored);
  assert.equal(remainingMs(restored.deadline, 20000), 6000);
  assert.equal(expire(restored, puzzle, 50000).results[0].status, 'timeout');
});
test('result screen and waiting for next cannot consume the next timer', () => {
  const locked = skip(active(), puzzle, 2000);
  assert.strictEqual(expire(locked, puzzle, 999999), locked);
  const next = advance(locked); assert.equal(next.deadline, null); assert.equal(next.phase, 'ready');
  assert.equal(begin(next, 999999).deadline, 1024999);
  const stillActive = active(); assert.strictEqual(advance(stillActive), stillActive);
});
test('all seven prompts, results, totals, and completion restore coherently', () => {
  let state = newState(puzzle); let score = 0;
  for (let i = 0; i < 7; i++) {
    assert.equal(state.index, i); state = begin(state, 1000 + i * 100000);
    const a = puzzle.prompts[i].answers[0]; score += a.score;
    state = submit(state, puzzle, a.canonical, 2000 + i * 100000).state;
    assert.ok(restoreState(state, puzzle)); state = advance(state);
  }
  assert.equal(state.phase, 'complete'); assert.equal(state.complete, true); assert.equal(state.results.length, 7);
  assert.equal(totalScore(state), score); assert.deepEqual(restoreState(state, puzzle), state);
  assert.strictEqual(begin(state, 999999), state); assert.strictEqual(advance(state), state);
  assert.strictEqual(submit(state, puzzle, 'France', 999999).state, state);
});
test('storage saves/restores and namespaces sample and daily by puzzle id', () => {
  const mem = memory(); const storage = createStorage({ getStorage: () => mem }); const state = active();
  assert.equal(storage.write(puzzle, true, state), true); assert.deepEqual(storage.read(puzzle, true), state);
  assert.equal(storage.read(puzzle, false), null);
  assert.notEqual(storageKey(puzzle, true), storageKey({ id: '2026-11-02' }, true));
});
test('malformed storage, impossible phases and forged scores handled gracefully', () => {
  const mem = memory(); let warnings = 0; const storage = createStorage({ getStorage: () => mem, onWarning: () => warnings++ });
  mem.setItem(storageKey(puzzle, true), '{broken'); assert.equal(storage.read(puzzle, true), null); assert.equal(warnings, 1);
  const edits = [s => s.index = 9, s => s.deadline = 0, s => s.puzzleId = '2026-11-02', s => s.complete = true, s => s.phase = 'complete', s => s.startedAt = '1000', s => s.content = 'changed'];
  for (const edit of edits) { const s = active(); edit(s); assert.equal(restoreState(s, puzzle), null); }
  const scored = submit(active(), puzzle, 'France', 2000).state;
  for (const edit of [s => s.results[0].score = 999, s => s.results[0].answer = 'Atlantis', s => s.results[0].timeMs = -1, s => s.results.push(s.results[0])]) {
    const s = structuredClone(scored); edit(s); assert.equal(restoreState(s, puzzle), null);
  }
  assert.equal(restoreState([], puzzle), null);
});
test('blocked localStorage reads and writes do not crash', () => {
  let warnings = 0; const storage = createStorage({ getStorage: () => { throw new Error('SecurityError'); }, onWarning: () => warnings++ });
  assert.equal(storage.read(puzzle, false), null); assert.equal(storage.write(puzzle, false, active()), false); assert.equal(warnings, 2);
});
test('spoiler-free sharing contains no prompt or answer text', () => {
  let state = active();
  for (let i = 0; i < 7; i++) { state = submit(state, puzzle, puzzle.prompts[i].answers[0].canonical, 2000 + i * 30000).state; state = advance(state); state = begin(state, 1000 + (i + 1) * 30000); }
  const text = shareText(puzzle, state, true);
  assert.match(text, /FLOPPIO SAMPLE/); assert.match(text, /7\/7 accepted/);
  for (const p of puzzle.prompts) { assert.ok(!text.includes(p.question)); }
  for (const r of state.results) { if (!/^\d+$/.test(r.answer)) assert.ok(!text.includes(r.answer)); }
});
test('native share, clipboard fallback, cancellation and manual fallback', async () => {
  assert.equal(await shareResults('result', { share: async () => {} }), 'shared');
  let copied; assert.equal(await shareResults('result', { clipboard: { writeText: async text => { copied = text; } } }), 'copied'); assert.equal(copied, 'result');
  assert.equal(await shareResults('result', { share: async () => { throw { name: 'AbortError' }; } }), 'cancelled');
  assert.equal(await shareResults('result', {}), 'manual');
  assert.equal(await shareResults('result', { share: async () => { throw new Error('denied'); }, clipboard: { writeText: async () => {} } }), 'copied');
});
test('missing daily puzzle, invalid JSON, network errors and samples never silently substituted', async () => {
  assert.equal((await loadPuzzle({ fetcher: async () => ({ ok: false, status: 404 }) })).reason, 'missing');
  assert.equal((await loadPuzzle({ fetcher: async () => { throw new Error('offline'); } })).ok, false);
  assert.equal((await loadPuzzle({ fetcher: async () => ({ ok: true, json: async () => { throw new Error('invalid JSON'); } }) })).ok, false);
  assert.equal((await loadPuzzle({ date: puzzle.id, fetcher: response(puzzle) })).reason, 'unpublished');
  assert.equal((await loadPuzzle({ date: '2026-02-30', fetcher: response(puzzle) })).ok, false);
});
test('UTC date changes at midnight independently of local timezone', () => {
  assert.equal(utcDate(Date.parse('2026-10-22T23:59:59Z')), '2026-10-22');
  assert.equal(utcDate(Date.parse('2026-10-23T00:00:00Z')), '2026-10-23');
});
test('sample answer sets are complete for their bounded categories', () => {
  assert.deepEqual(puzzle.prompts.map(p => p.answers.length), [9, 8, 6, 6, 7, 10, 5]);
  const primes = [];
  for (let n = 2; n < 30; n++) if (Array.from({length:n-2}, (_,i)=>i+2).every(d=>n%d!==0)) primes.push(String(n));
  assert.deepEqual(puzzle.prompts[5].answers.map(a=>a.canonical), primes);
});

test('numeric punctuation cannot turn an invalid value into a valid prime', () => {
  for (const input of ['-2', '- 2', '.2', '29%', '2/3', '2.9', '−2']) {
    assert.equal(matchAnswer(input, puzzle.prompts[5]).kind, 'invalid', input);
  }
});
