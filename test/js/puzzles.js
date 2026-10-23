import { utcDate } from './config.js';
import { validatePuzzle, validDate } from './validation.js';

export async function loadPuzzle({ date = utcDate(), sample = false, fetcher = fetch } = {}) {
  if (!validDate(date)) return { ok: false, reason: 'invalid' };
  try {
    const response = await fetcher(`./puzzles/${date}.json`, { cache: 'no-store' });
    if (!response.ok) return { ok: false, reason: response.status === 404 ? 'missing' : 'network' };
    const puzzle = validatePuzzle(await response.json(), date);
    if (puzzle.sample !== sample) return { ok: false, reason: 'unpublished' };
    return { ok: true, puzzle };
  } catch {
    return { ok: false, reason: 'invalid-or-network' };
  }
}
