import { totalScore } from './scoring.js';
export function shareText(puzzle, state, sample = false) {
  return `FLOPPIO ${sample ? 'SAMPLE · ' : ''}${puzzle.id}\n${totalScore(state)} points · ${state.results.filter(r => r.status === 'accepted').length}/7 accepted\n${state.results.map(r => r.status === 'accepted' ? '🟩' : r.status === 'skipped' ? '⬜' : '⬛').join('')}\nThink rare. Don't flop.`;
}
export async function shareResults(text, nav = navigator) {
  if (typeof nav.share === 'function') {
    try { await nav.share({ title: 'Floppio results', text }); return 'shared'; }
    catch (error) { if (error.name === 'AbortError') return 'cancelled'; }
  }
  try { await nav.clipboard.writeText(text); return 'copied'; }
  catch { return 'manual'; }
}
