# Floppio V0.1 engineering handoff

## Status

End-to-end playable foundation implemented locally on `floppio-v0.1`, based on `628805c`. The branch lives in an isolated Git worktree at `C:\Users\Brandon\Documents\Codex\2026-10-22\files-pasted-by-the-user-start\outputs\floppio-website`, linked to the existing GitHub Desktop clone. The original checkout remains on `main`. No push, merge, live deployment, DNS change or Pages configuration change was performed. Use `git log -1 --oneline` in this worktree for the implementation commit.

## Implemented

- Exactly seven prompts, 25-second absolute deadlines, one locked result per prompt, invalid retries, skips, timeouts and explicit next actions.
- Editorial rarity scores, independently recorded answer times, per-prompt result screens and final seven-result breakdown.
- Case/whitespace/punctuation/accent normalization, explicit aliases, conservative one-edit typo suggestions with ERASE/SEND and ambiguity rejection.
- External UTC-date JSON loading with structural validation, unavailable state, and explicitly labeled sample mode that cannot masquerade as daily content.
- Puzzle-specific localStorage, sample/daily separation, refresh recovery, expiry on return, corrupt-state rejection and blocked-storage notices.
- Start, continue and completed-results states; UTC rollover notice; basic cross-tab storage-event synchronization.
- Spoiler-free native share with clipboard then selectable-text fallback.
- Existing Floppio logo/disk art and colors, responsive layout, labels, Enter submission, focus handling and reduced-motion support.

## Files

All game code is new under `test/`: `index.html`, `game.css`, `package.json`, three copied assets, `puzzles/2026-11-01.json`, `tests/engine.test.js`, `tools/serve.mjs`, and the modules listed below. Root additions are `README.md`, `PUZZLE_SCHEMA.md`, and this document. Existing root `index.html`, `style.css`, `script.js`, `CNAME`, and original assets are unchanged.

| Module | Responsibility |
| --- | --- |
| `app.js` | Fetch, restore, screen transitions, DOM events, storage events and clock callbacks. |
| `config.js` | Seven-prompt count, 25-second duration, sample date, UTC date helper. |
| `puzzles.js` | Relative JSON fetch; daily/sample gating; failures as data. |
| `validation.js` | Schema and normalized alias collision validation. |
| `state.js` | Pure immutable transitions and strict restored-state checks. |
| `timing.js` | Deadline arithmetic and clock/visibility/pageshow notifications. |
| `matching.js` | Normalization, exact matching and conservative edit-distance suggestions. |
| `scoring.js` | Editorial score extraction and total summation. |
| `storage.js` | Versioned puzzle-specific keys, guarded reads/writes and notices. |
| `view.js` | Escaped DOM rendering, focus, timer display and result breakdowns. |
| `sharing.js` | Spoiler-free text and share/clipboard/manual outcomes. |

## Architecture decisions

Native ES modules, no libraries or build step. Node is used only for development checks and an optional static server. Gameplay states are `ready → active → result → ready`, ending in `complete`. `ready` has no deadline. The question is rendered before `begin` creates a deadline. The seventh lock marks the challenge complete; the player can then view the final screen. All answer/skip transitions check expiry first, including suggestion confirmation.

State persists a contiguous result prefix, canonical answers, exact editorial scores, time used, active start/deadline, index, completion and a serialized puzzle content signature. Restoration validates every result against the matching prompt. Never mutate an already published puzzle: content changes reject old progress with a notice. Storage failures allow in-memory play but cannot guarantee refresh persistence. Device clock changes and manually edited storage are outside the anti-cheat scope.

Sample mode is a development route `?sample=1`, fixed to the labeled November 1 sample; it is not a second official mode. It has its own key and shared results label. There is no silent fallback or completed daily replay button. An open game remains associated with its original date across midnight; a banner offers the new UTC disk. Reloading always selects the current UTC date automatically.

## Refinement: sample replay, developer reset and skyline

This follow-up builds on foundation commit `38dd1c0` on the same `floppio-v0.1` branch. Use `git log -1 --oneline` for the refinement commit. No push, merge or deployment was performed.

Changed: `README.md`, `DEV_HANDOFF.md`, `test/index.html`, `test/game.css`, `test/js/app.js`, `test/js/storage.js`, `test/js/view.js`. Added: `test/dev-reset.html`, `test/js/dev-reset.js`, `test/js/reset.js`, `test/tests/reset.test.js`, `test/assets/floppio-skyline.png`. Engine transitions, scoring, timing, matching, puzzle data, sharing, root landing files and hosting configuration are unchanged.

**Sample:** open `/test/?sample=1`; after completion select PLAY SAMPLE AGAIN → CONFIRM RESET → PLAY. From a saved start/continue screen use RESET TEST GAME → CONFIRM RESET → PLAY. Cancellation and Escape preserve progress. Reset removes only the current sample key and discards the in-memory run; it does not start a timer. A timer already running continues during the dialog. The sample label remains visible.

**Daily developer utility:** manually open `/test/dev-reset.html` on the same origin and browser profile. Verify the date/key, select RESET DAILY PROGRESS → CONFIRM RESET → OPEN DAILY GAME → PLAY. It uses the current UTC date at the time of the reset click; that target remains pinned during confirmation. It works when the puzzle is absent or storage is malformed, but cannot create a missing puzzle. Normal game screens contain no daily reset link/control.

**Static-hosting limitation:** this unlinked utility is not secure access control. Anyone knowing the URL can reset their own local progress. No other device, profile, origin or user is affected. No credentials or backend were added. Single-key removal preserves sample data, other dates and unrelated storage. Failure to remove is reported and results are retained. Close other game tabs for reliable testing. Updated open tabs react to the removal event by dropping stale memory and returning to PLAY; old cached tabs and simultaneous writes remain best effort.

**Visuals:** copied the existing skyline into the portable test assets. A noninteractive fixed background with a tall desktop scale, a mobile crop and a vertical mask brings the city behind and below the layout. Panels remain nearly opaque, with protected footer/mode labels and breathing room below the game. No animation or redesign was added.

### Refinement verification (2026-10-22 local / 2026-10-23 UTC)

- **29 automated tests passed**, including all 22 foundation tests and 7 reset tests. Added coverage for three complete replay cycles, confirmation cancellation, daily/sample/other-date isolation, corrupt and missing saves, blocked removal, UTC targeting, daily one-play enforcement, and absence of daily reset controls.
- In-app Chromium: completed two full sample replay runs after reset (450 points with all seven accepted; 65 points with one accepted and six skips). Verified results replay, start-screen reset, repeated reuse, cancellation and fresh prompt-one/zero-score/25-second state.
- Verified exact, alias and confirmed typo answers, skip, final breakdown and persistence. An active timer expired at 25 seconds while the sample reset dialog was open; cancellation retained the timeout.
- Used a temporary local-only daily fixture dated 2026-10-23. Completed seven daily prompts, refreshed to VIEW RESULTS, reset the sample and verified the completed daily save remained locked. Developer-reset cancellation preserved daily completion; confirmation returned an already open daily tab to PLAY and permitted a fresh answer. The sample's 65-point result survived daily reset and refresh.
- Reviewed screenshots at **1366 × 900 desktop** and **390 × 844 phone-width** viewports, including active gameplay, typo suggestion, results and mobile reset dialog. The skyline is prominent and input/timer/dialog remain legible. This is browser viewport testing, not physical-device testing.
- The temporary daily fixture was removed before commit. Unavailable daily handling and developer reset without a puzzle were rechecked. Sharing implementation is unchanged; existing native/clipboard/manual-fallback automated tests still pass.

No new blocking issues were found. Remaining pre-publication checks are physical iOS/Android testing, browser/OS sharing and editorial approval of official daily content. See the remaining-verification section below. The hidden reset utility must never be described as secure owner authentication.

## Foundation verification (2026-10-22)

`node --test test/tests/*.test.js`: **22 passed, 0 failed**. Covers all 17 requested minimum categories plus UTC boundaries, storage unavailability, schema/alias collision cases, sample isolation, native/clipboard/manual share outcomes, and bounded sample datasets. One initial assertion incorrectly compared two separately created objects by identity; the assertion was corrected and the suite rerun successfully.

Actual Codex in-app Chromium browser checks at desktop size and a **390 × 844 CSS-pixel viewport**:

- Sample loads with visible sample labels; missing current daily content shows a friendly unavailable screen.
- Belguim produces Belgium suggestion at zero points; ERASE clears it; SEND awards 65 and locks.
- Active timer showed 14 seconds before refresh and 14 after CONTINUE.
- Timer expiry locks at zero with 25.0 seconds used; refresh restores that locked result.
- Invalid entry allows retry; Xe alias submits by Enter and awards 80 for Xenon.
- SKIP awards zero; meter accepts Metre; Twenty-nine accepts 29.
- Completed all seven prompts with five accepted, one skipped, one timed out: **345 points** and all seven breakdown rows.
- Sharing returned the native API success state in the in-app browser. Native OS share-sheet delivery to a destination was not independently verified; clipboard/manual paths were exercised with automated test doubles.
- Refresh after completion offers VIEW RESULTS and restores 345 points, without replay.
- Screenshots reviewed for desktop and phone-width active/results/unavailable layouts. No app warnings/errors were captured in the browser log during the gameplay pass.

## Limitations and remaining verification

No known blocking gameplay defects in the exercised paths. Remaining limits:

- Phone-width browser testing is **not real-device verification**. Test iOS Safari and Android Chrome, touch keyboard/rotation, app switching, device sleep and low-height landscape before approval.
- Test desktop Safari/Firefox/Edge, screen-reader navigation and OS sharing/clipboard behavior. Browser permission restrictions may require manual copy.
- LocalStorage is device/browser/origin-specific and can be cleared or blocked. It is not a secure score store. Cross-tab synchronization is best effort, not an atomic multiplayer/anti-cheat mechanism; use one tab for testing.
- Same-day puzzle edits invalidate stored progress. Establish immutable publishing and editorial review before launch.
- Suggestion matching intentionally supports only conservative Latin-letter one-edit candidates; multilingual transliteration and broader typo tolerance are future work.
- Scores are provisional editorial values; no measured rarity, leaderboard or ranking is claimed. Sample facts/aliases need independent editorial approval. No official daily content has been published.
- No live `/test/` URL exists from this work. GitHub Pages compatibility is by static architecture; actual hosted smoke testing awaits owner-approved publishing.

## Next engineering assignment

Run the real-device and cross-browser acceptance matrix, review matching sensitivity and sample aliases with testers, prepare a small approved queue of immutable UTC daily puzzles, then seek approval for publishing only `/test/`. Keep accounts, analytics, leaderboards and visual redesign out of that assignment.

## Quick manual acceptance sequence

1. Start the local server using the README instructions; open `/test/` and confirm unavailable handling, then follow OPEN SAMPLE DISK.
2. Try Belguim; confirm score stays zero before SEND. Try ERASE and an invalid answer; use Enter for exact/alias submission.
3. Refresh an active question, continue, and verify the countdown did not reset. Let another prompt expire while away.
4. Leave a result screen open for over 25 seconds; press NEXT PROMPT and verify the new question begins at 25 seconds.
5. Complete seven prompts using both answers and skips. Verify sum, times, spoiler-free sharing and completed-game restoration. Reset/replay the sample twice and cancel once. Verify daily completion remains unchanged.
6. Visit the unlinked developer utility; verify the key, cancel, then confirm. Verify daily replay works and sample progress survives. Test storage blocking/corruption in an isolated browser profile; confirm notices and recovery.
7. Repeat on actual desktop/mobile browsers. Record device, version and results before declaring V0.1 accepted for deployment.
