import { dailyResetTarget, resetProgress, confirmReset } from './reset.js';
import { createStorage, storageKey } from './storage.js';

const status = document.querySelector('#reset-status');
const button = document.querySelector('#reset-daily');
const dialog = document.querySelector('#reset-dialog');
const storage = createStorage({ onWarning: message => { status.textContent = message; } });
let target;
function showTarget() {
  target = dailyResetTarget();
  document.querySelector('#reset-date').textContent = `${target.id} UTC`;
  document.querySelector('#daily-key').textContent = storageKey(target, false);
}
showTarget();
button.addEventListener('click', async () => {
  showTarget(); // Pin the confirmation to the UTC date at the time of the click.
  button.disabled = true;
  const result = await resetProgress({ storage, puzzle: target, sample: false,
    confirm: details => confirmReset(dialog, details) });
  button.disabled = false;
  status.textContent = {
    reset: `Daily progress for ${target.id} cleared. Open the daily game to play again. A valid puzzle for today must still exist.`,
    cancelled: 'Reset cancelled. Your progress has not been changed.',
    failed: 'Daily progress could not be cleared. Browser storage may be blocked; no successful reset was reported.',
    invalid: 'The reset date is invalid. Reload this utility and try again.'
  }[result];
  if (result === 'reset') document.querySelector('#open-daily').focus();
});
