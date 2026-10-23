export const PROMPT_COUNT = 7;
export const DURATION_MS = 25_000;
export const SAMPLE_DATE = '2026-11-01';
export const utcDate = (now = Date.now()) => new Date(now).toISOString().slice(0, 10);
