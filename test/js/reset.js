import { storageKey } from './storage.js';
import { validDate } from './validation.js';
import { utcDate } from './config.js';

// This utility is deliberately not authentication. It only removes one local key.
export const dailyResetTarget = (now = Date.now()) => ({ id: utcDate(now) });
export async function resetProgress({ storage, puzzle, sample, confirm }) {
  if (!validDate(puzzle?.id) || typeof sample !== 'boolean') return 'invalid';
  const key = storageKey(puzzle, sample);
  if (!await confirm({ id: puzzle.id, sample, key })) return 'cancelled';
  return storage.remove(puzzle, sample) ? 'reset' : 'failed';
}

export function confirmReset(dialog, { id, sample, key }) {
  dialog.querySelector('[data-reset-title]').textContent = sample ? 'Reset this sample game?' : 'Reset daily progress?';
  dialog.querySelector('[data-reset-description]').textContent = sample
    ? `Clear sample answers, score and timer for ${id}? You can play the sample again. Daily progress is not affected.`
    : `Clear daily answers, score and timer for ${id} UTC in this browser? Sample progress and other dates are not affected.`;
  dialog.querySelector('[data-reset-key]').textContent = key;
  dialog.returnValue = 'cancel';
  return new Promise(resolve => {
    dialog.addEventListener('close', () => resolve(dialog.returnValue === 'reset'), { once: true });
    dialog.showModal();
  });
}
