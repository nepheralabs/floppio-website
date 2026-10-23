import { SAMPLE_DATE, utcDate } from './config.js';
import { loadPuzzle } from './puzzles.js';
import { newState, begin, submit, skip, advance, expire } from './state.js';
import { createStorage, storageKey } from './storage.js';
import { watchClock } from './timing.js';
import { shareText, shareResults } from './sharing.js';
import { View } from './view.js';
import { resetProgress, confirmReset } from './reset.js';

const sample = new URLSearchParams(location.search).get('sample') === '1';
const date = sample ? SAMPLE_DATE : utcDate();
const root = document.querySelector('#game');
const view = new View(root);
const warning = document.querySelector('#storage-warning');
const resetDialog = document.querySelector('#reset-dialog');
const storage = createStorage({ onWarning: message => { warning.textContent = message; warning.hidden = false; } });
let puzzle, state, screen = 'start', suggestion = null;
const save = () => storage.write(puzzle, sample, state);
const on = (id, handler, type = 'click') => root.querySelector(`#${id}`).addEventListener(type, handler);
function bindSampleReset() {
  const button = root.querySelector('#reset-sample');
  if (!sample || !button) return;
  button.addEventListener('click', async () => {
    button.disabled = true;
    const result = await resetProgress({ storage, puzzle, sample: true,
      confirm: details => confirmReset(resetDialog, details) });
    button.disabled = false;
    if (result === 'reset') {
      state = newState(puzzle); suggestion = null;
      warning.hidden = true;
      showStart(); // No timer or save until the player chooses PLAY.
      root.scrollIntoView({ block: 'start' });
    } else {
      checkExpiry(); // Cancelling a reset never pauses an active deadline.
    }
  });
}
function checkExpiry(now = Date.now()) {
  if (!state) return;
  const checked = expire(state, puzzle, now);
  if (checked !== state) {
    state = checked; suggestion = null; save();
    if (screen === 'game') render();
    else showStart();
  }
}
function showStart() {
  screen = 'start'; view.start(puzzle, state, sample);
  bindSampleReset();
  on('play', () => {
    checkExpiry();
    if (state.complete) state = { ...state, phase: 'complete' };
    screen = 'game'; render();
  });
}
function answer(input) {
  const outcome = submit(state, puzzle, input, Date.now());
  state = outcome.state;
  if (state.phase !== 'active') { suggestion = null; save(); render(); return; }
  suggestion = null; view.hideSuggestion();
  if (outcome.match.kind === 'suggestion') {
    suggestion = outcome.match.answer;
    view.feedback('Check the spelling suggestion below.'); view.suggest(suggestion);
  } else {
    view.feedback(outcome.match.kind === 'ambiguous' ? 'That could mean more than one answer. Please spell out your answer.' : 'Not an accepted answer. Try again while time remains.');
    root.querySelector('#answer').focus();
  }
}
function render() {
  suggestion = null;
  if (state.phase === 'ready' || state.phase === 'active') {
    // Show the question before creating its deadline; restoring active state
    // preserves the existing absolute deadline.
    view.question(puzzle, state);
    state = begin(state, Date.now()); save(); view.tick(state, Date.now());
    on('answer-form', event => { event.preventDefault(); answer(root.querySelector('#answer').value); }, 'submit');
    on('skip', () => { state = skip(state, puzzle, Date.now()); save(); render(); });
    on('erase', () => {
      checkExpiry(); if (state.phase !== 'active') return;
      suggestion = null; view.hideSuggestion(); view.feedback('');
      const input = root.querySelector('#answer'); input.value = ''; input.focus();
    });
    on('send', () => { if (suggestion) answer(suggestion.canonical); });
    on('answer', () => { suggestion = null; view.hideSuggestion(); }, 'input');
  } else if (state.phase === 'result') {
    view.result(puzzle, state);
    on('next', () => { state = advance(state); save(); render(); });
  } else {
    save();
    const text = shareText(puzzle, state, sample);
    view.final(puzzle, state, sample, text);
    bindSampleReset();
    on('share', async () => {
      const result = await shareResults(text);
      const status = root.querySelector('#share-status');
      if (!status) return;
      status.textContent = { shared: 'Results shared.', copied: 'Results copied to clipboard.', cancelled: 'Sharing cancelled.', manual: 'Select and copy your results below.' }[result];
      if (result === 'manual') {
        root.querySelector('#manual-share').hidden = false;
        root.querySelector('#share-text').select();
      }
    });
  }
}
async function init() {
  if (sample) document.querySelector('#mode').textContent = 'SAMPLE MODE / TEST CONTENT / NOT THE DAILY CHALLENGE';
  const loaded = await loadPuzzle({ date, sample });
  if (!loaded.ok) { view.unavailable(date); on('retry', () => location.reload()); return; }
  puzzle = loaded.puzzle;
  state = storage.read(puzzle, sample) ?? newState(puzzle);
  state = expire(state, puzzle, Date.now()); save(); showStart();
  watchClock(now => {
    checkExpiry(now);
    if (state.phase === 'active' && screen === 'game') view.tick(state, now);
    if (!sample && utcDate(now) !== date) document.querySelector('#new-day').hidden = false;
  });
  window.addEventListener('storage', event => {
    if (event.key !== storageKey(puzzle, sample)) return;
    if (event.newValue === null) {
      // A reset in another open tab must discard the old in-memory run too.
      if (resetDialog.open) resetDialog.close('cancel');
      state = newState(puzzle); suggestion = null; showStart();
      return;
    }
    const other = storage.read(puzzle, sample);
    if (!other) return;
    // Adopt progress from another tab without re-awarding points.
    state = expire(other, puzzle, Date.now()); suggestion = null;
    if (screen === 'game') render(); else showStart();
  });
}
init().catch(() => { view.unavailable(date); on('retry', () => location.reload()); });
