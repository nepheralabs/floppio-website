import { PROMPT_COUNT } from './config.js';
import { normalize } from './matching.js';

export function validDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)
    && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}
const text = (v, max = 300) => typeof v === 'string' && v.trim().length > 0 && v.length <= max;
export function validatePuzzle(puzzle, expectedDate) {
  const fail = message => { throw new Error(`Invalid puzzle: ${message}`); };
  if (!puzzle || puzzle.schemaVersion !== 1) fail('schemaVersion must be 1');
  if (!validDate(puzzle.id) || puzzle.date !== puzzle.id || (expectedDate && puzzle.id !== expectedDate)) fail('date/id mismatch');
  if (!text(puzzle.title, 100) || typeof puzzle.sample !== 'boolean') fail('title and sample flag required');
  if (!Array.isArray(puzzle.prompts) || puzzle.prompts.length !== PROMPT_COUNT) fail('exactly seven prompts required');
  const ids = new Set();
  for (const prompt of puzzle.prompts) {
    if (!prompt || !text(prompt.id, 80) || ids.has(prompt.id)) fail('unique prompt ids required');
    ids.add(prompt.id);
    if (!text(prompt.question) || (prompt.fuzzy !== undefined && typeof prompt.fuzzy !== 'boolean')) fail('question or fuzzy flag');
    if (!Array.isArray(prompt.answers) || !prompt.answers.length || prompt.answers.length > 500) fail('answer dataset');
    const names = new Map();
    for (const answer of prompt.answers) {
      if (!answer || !text(answer.canonical, 120) || !normalize(answer.canonical)) fail('canonical answer');
      if (!Number.isInteger(answer.score) || answer.score < 0 || answer.score > 1000) fail('score must be an integer from 0 to 1000');
      if (!Array.isArray(answer.aliases) || answer.aliases.some(a => !text(a, 120) || !normalize(a))) fail('aliases must be strings');
      for (const name of [answer.canonical, ...answer.aliases].map(normalize)) {
        if (names.has(name) && names.get(name) !== answer) fail('normalized answers/aliases collide');
        names.set(name, answer);
      }
    }
  }
  return puzzle;
}
