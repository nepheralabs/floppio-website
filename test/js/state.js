import { DURATION_MS, PROMPT_COUNT } from './config.js';
import { matchAnswer } from './matching.js';
import { scoreAnswer } from './scoring.js';
import { timeUsed } from './timing.js';

export function newState(puzzle) {
  return { version: 1, puzzleId: puzzle.id, content: JSON.stringify(puzzle), index: 0,
    phase: 'ready', results: [], startedAt: null, deadline: null, complete: false };
}
export function begin(state, now) {
  if (state.phase !== 'ready') return state;
  return { ...state, phase: 'active', startedAt: now, deadline: now + DURATION_MS };
}
function lock(state, puzzle, status, answer, now) {
  if (state.phase !== 'active' || state.results.length !== state.index) return state;
  const result = { promptId: puzzle.prompts[state.index].id, status,
    answer: answer?.canonical ?? null, score: answer ? scoreAnswer(answer) : 0,
    timeMs: status === 'timeout' ? DURATION_MS : timeUsed(state.startedAt, now) };
  const results = [...state.results, result];
  return { ...state, results, phase: 'result', startedAt: null, deadline: null, complete: results.length === PROMPT_COUNT };
}
export function expire(state, puzzle, now) {
  return state.phase === 'active' && now >= state.deadline ? lock(state, puzzle, 'timeout', null, now) : state;
}
export function submit(state, puzzle, input, now) {
  const checked = expire(state, puzzle, now);
  if (checked.phase !== 'active') return { state: checked, match: { kind: 'locked' } };
  const match = matchAnswer(input, puzzle.prompts[state.index]);
  return { state: match.kind === 'exact' ? lock(state, puzzle, 'accepted', match.answer, now) : state, match };
}
export function skip(state, puzzle, now) {
  const checked = expire(state, puzzle, now);
  return checked.phase === 'active' ? lock(checked, puzzle, 'skipped', null, now) : checked;
}
export function advance(state) {
  if (state.phase !== 'result') return state;
  return state.complete ? { ...state, phase: 'complete' } : { ...state, index: state.index + 1, phase: 'ready' };
}

// Restore only a coherent prefix of the puzzle. Scores are checked against the
// editorial data, never trusted from storage or re-awarded during rendering.
export function restoreState(value, puzzle) {
  if (!value || value.version !== 1 || value.puzzleId !== puzzle.id || value.content !== JSON.stringify(puzzle)) return null;
  if (!Number.isInteger(value.index) || value.index < 0 || value.index >= PROMPT_COUNT) return null;
  if (!Array.isArray(value.results) || value.results.length > PROMPT_COUNT) return null;
  if (!['ready', 'active', 'result', 'complete'].includes(value.phase)) return null;
  const count = value.results.length;
  if (value.complete !== (count === PROMPT_COUNT)) return null;
  if (['ready', 'active'].includes(value.phase) && (count !== value.index || value.complete)) return null;
  if (value.phase === 'result' && count !== value.index + 1) return null;
  if (value.phase === 'complete' && (!value.complete || value.index !== PROMPT_COUNT - 1)) return null;
  if (value.phase === 'active') {
    if (!Number.isSafeInteger(value.startedAt) || value.startedAt < 0 || value.deadline !== value.startedAt + DURATION_MS) return null;
  } else if (value.startedAt !== null || value.deadline !== null) return null;
  for (let i = 0; i < count; i++) {
    const r = value.results[i];
    if (!r || r.promptId !== puzzle.prompts[i].id || !['accepted', 'skipped', 'timeout'].includes(r.status)) return null;
    if (!Number.isFinite(r.timeMs) || r.timeMs < 0 || r.timeMs > DURATION_MS) return null;
    if (r.status === 'accepted') {
      const answer = puzzle.prompts[i].answers.find(a => a.canonical === r.answer);
      if (!answer || r.score !== answer.score || r.timeMs >= DURATION_MS) return null;
    } else if (r.answer !== null || r.score !== 0 || (r.status === 'timeout' && r.timeMs !== DURATION_MS)) return null;
  }
  return structuredClone(value);
}
