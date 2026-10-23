import { DURATION_MS } from './config.js';
export const remainingMs = (deadline, now = Date.now()) => Math.max(0, Math.min(DURATION_MS, deadline - now));
export const timeUsed = (startedAt, now = Date.now()) => Math.max(0, Math.min(DURATION_MS, now - startedAt));
export function watchClock(callback) {
  const tick = () => callback(Date.now());
  const interval = setInterval(tick, 100);
  document.addEventListener('visibilitychange', tick);
  window.addEventListener('pageshow', tick);
  tick();
  return () => {
    clearInterval(interval);
    document.removeEventListener('visibilitychange', tick);
    window.removeEventListener('pageshow', tick);
  };
}
