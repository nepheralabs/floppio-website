import { restoreState } from './state.js';
export const storageKey = (puzzle, sample = false) => `floppio:v1:${sample ? 'sample' : 'daily'}:${puzzle.id}`;
export function createStorage({ getStorage = () => globalThis.localStorage, onWarning = () => {} } = {}) {
  return {
    remove(puzzle, sample) {
      try { getStorage().removeItem(storageKey(puzzle, sample)); return true; }
      catch { onWarning('Progress could not be cleared. Browser storage may be blocked.'); return false; }
    },
    read(puzzle, sample) {
      try {
        const raw = getStorage().getItem(storageKey(puzzle, sample));
        if (raw === null) return null;
        const restored = restoreState(JSON.parse(raw), puzzle);
        if (!restored) onWarning('Saved progress could not be restored. This disk will start fresh.');
        return restored;
      } catch {
        onWarning('Saved progress is unavailable or damaged. Keep this page open; progress may not survive a refresh.');
        return null;
      }
    },
    write(puzzle, sample, state) {
      try { getStorage().setItem(storageKey(puzzle, sample), JSON.stringify(state)); return true; }
      catch { onWarning('Progress cannot be saved in this browser. Keep this page open to finish.'); return false; }
    }
  };
}
