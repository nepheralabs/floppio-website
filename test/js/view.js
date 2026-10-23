import { totalScore } from './scoring.js';
import { DURATION_MS } from './config.js';
import { remainingMs } from './timing.js';
export const escapeHTML = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const seconds = ms => `${(ms / 1000).toFixed(1)}s`;
const statusText = { accepted: 'ANSWER ACCEPTED', skipped: 'PROMPT SKIPPED', timeout: 'TIME EXPIRED' };
export class View {
  constructor(root) { this.root = root; }
  show(html) { this.root.innerHTML = html; this.root.focus({ preventScroll: true }); }
  unavailable(date) {
    this.show(`<p class="eyebrow">DAILY DISK / ${escapeHTML(date)} UTC</p><h1>Today's disk isn't ready.</h1><p>The daily puzzle is missing, unavailable, or still being checked. Please try again later.</p><div class="actions"><button id="retry">TRY AGAIN</button></div><details open><summary>Development testing</summary><p>Load the labeled seven-prompt sample. This is testing content, not today's official challenge.</p><a href="?sample=1">OPEN SAMPLE DISK →</a></details>`);
  }
  start(puzzle, state, sample) {
    const label = state.complete ? 'VIEW RESULTS' : state.phase !== 'ready' || state.index > 0 ? 'CONTINUE' : 'PLAY';
    this.show(`<p class="eyebrow">${sample ? 'SAMPLE DISK' : 'DAILY DISK'} / ${escapeHTML(puzzle.date)} UTC</p><div class="intro"><div><h1>Think rare.<br>Make it count.</h1><p class="lead">Seven prompts. One uncommon answer at a time.</p></div><img class="disk" src="./assets/floppio-disk.png" alt="" /></div><ul class="rules"><li>You have 25 seconds for each prompt.</li><li>Rarer valid answers earn more editorial points.</li><li>Retry invalid answers while time remains. Skip for zero.</li><li>The next timer waits for you to press NEXT PROMPT.</li></ul><p class="hint">${escapeHTML(puzzle.title)}${sample ? ' · Test data; rarity values are provisional.' : ''}</p><div class="actions"><button id="play">${label}</button>${sample && (state.phase !== 'ready' || state.index > 0) ? '<button id="reset-sample" class="secondary">RESET TEST GAME</button>' : ''}</div>${state.phase === 'active' ? '<p class="hint">Your current question timer is still running.</p>' : ''}${sample ? '<p class="hint"><a href="./">Return to the daily disk</a></p>' : ''}`);
  }
  question(puzzle, state) {
    const prompt = puzzle.prompts[state.index];
    this.show(`<div class="stats"><span>PROMPT ${state.index + 1} / 7</span><span>SCORE <strong>${totalScore(state)}</strong></span><span id="timer" class="timer" role="timer" aria-live="off" aria-label="Seconds remaining">25s</span></div><div class="timer-track" aria-hidden="true"><div id="timer-fill" class="timer-fill"></div></div><h2 id="question-heading">${escapeHTML(prompt.question)}</h2><form id="answer-form" autocomplete="off"><label for="answer">Your answer</label><input id="answer" name="answer" maxlength="120" required spellcheck="false" autocorrect="off" autocapitalize="none" aria-describedby="answer-help feedback"><p id="answer-help" class="hint">One answer. Think uncommon.</p><p id="feedback" class="feedback" role="status" aria-live="polite"></p><div class="actions"><button type="submit">SUBMIT</button><button id="skip" class="secondary" type="button">SKIP</button></div></form><section id="suggestion" class="suggestion" aria-label="Spelling suggestion" hidden><p id="suggestion-copy" role="status"></p><div class="actions"><button id="erase" class="secondary">ERASE</button><button id="send">SEND</button></div><p class="hint">The timer is still running.</p></section>`);
    this.root.scrollIntoView({ block: 'start' });
    this.root.querySelector('#answer').focus({ preventScroll: true });
  }
  tick(state, now) {
    const timer = this.root.querySelector('#timer');
    if (!timer) return;
    const remaining = remainingMs(state.deadline, now);
    timer.textContent = `${Math.ceil(remaining / 1000)}s`;
    timer.classList.toggle('urgent', remaining <= 5000);
    this.root.querySelector('#timer-fill').style.width = `${remaining / DURATION_MS * 100}%`;
  }
  feedback(message) { this.root.querySelector('#feedback').textContent = message; }
  suggest(answer) {
    this.root.querySelector('#suggestion-copy').textContent = `Did you mean ${answer.canonical}?`;
    this.root.querySelector('#suggestion').hidden = false;
    this.root.querySelector('#send').focus({ preventScroll: true });
  }
  hideSuggestion() { this.root.querySelector('#suggestion').hidden = true; }
  result(puzzle, state) {
    const result = state.results[state.index];
    this.show(`<p class="eyebrow">PROMPT ${state.index + 1} / 7 · ${statusText[result.status]}</p><h2>${result.answer ? escapeHTML(result.answer) : result.status === 'skipped' ? 'On to the next idea.' : 'Time slipped away.'}</h2><p class="points">+${result.score} <small>POINTS</small></p><p>Time used: ${seconds(result.timeMs)} <span aria-hidden="true">/</span> Total: <strong>${totalScore(state)}</strong></p><p class="muted">${result.status === 'accepted' ? 'Answer locked. Your rarity score is saved.' : 'This prompt is locked with zero points.'}</p><div class="actions"><button id="next">${state.complete ? 'VIEW FINAL RESULTS' : 'NEXT PROMPT'}</button></div><p class="hint">${state.complete ? 'All seven prompts complete.' : 'Take a breath. The next timer starts when the next prompt appears.'}</p>`);
  }
  final(puzzle, state, sample, text) {
    this.show(`<p class="eyebrow">${sample ? 'SAMPLE DISK' : 'DAILY DISK'} COMPLETE / ${escapeHTML(puzzle.date)}</p><h1>Disk complete.</h1><p class="points">${totalScore(state)} <small>POINTS</small></p><p>${state.results.filter(r => r.status === 'accepted').length} of 7 accepted · ${seconds(state.results.reduce((sum, r) => sum + r.timeMs, 0))} total answer time</p><div class="actions"><button id="share">SHARE RESULTS</button>${sample ? '<button id="reset-sample" class="secondary">PLAY SAMPLE AGAIN</button>' : ''}</div><p class="share-note">Only your score and result squares are shared. No questions or answers.</p><p id="share-status" role="status"></p><div id="manual-share" hidden><label for="share-text">Copy these spoiler-free results</label><textarea id="share-text" readonly>${escapeHTML(text)}</textarea></div><ol class="result-list">${state.results.map((r, i) => `<li><p class="result-question">${i + 1}. ${escapeHTML(puzzle.prompts[i].question)}</p><div class="result-detail"><strong>${escapeHTML(r.answer ?? (r.status === 'skipped' ? 'Skipped' : 'Timed out'))}</strong><span>${r.score} pts · ${seconds(r.timeMs)}</span></div></li>`).join('')}</ol><p class="hint">${sample ? 'Sample results stay separate from the daily challenge.' : 'A new daily disk arrives at 00:00 UTC.'}</p>${sample ? '<a href="./">Return to the daily disk →</a>' : ''}`);
  }
}
