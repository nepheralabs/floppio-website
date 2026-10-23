# Floppio V0.1 — playable foundation

An isolated, buildless daily trivia game in `/test/`. The existing landing page and hosting settings are untouched. Nothing has been pushed or deployed.

## Try it locally

From this repository folder, run:

```powershell
node test/tools/serve.mjs
```

Open **http://127.0.0.1:4173/test/?sample=1** for the labeled seven-question sample. Open **http://127.0.0.1:4173/test/** for the current UTC daily puzzle. No official daily puzzle is shipped, so the latter correctly displays an unavailable screen. Do not open `index.html` directly: browser modules and JSON loading need HTTP.

Node 20+ is only a development convenience for the local server and tests. The game uses native browser modules, HTML, CSS, JSON and localStorage. No installation, build, backend or Node runtime is needed on GitHub Pages. Any static HTTP server serving the repository works. The preview server binds only to this computer. Stop it with Ctrl+C.

To run automated tests:

```powershell
node --test test/tests/*.test.js
```

## Playing

Press PLAY, enter a valid answer within 25 seconds, and press Enter or SUBMIT. Invalid answers may be retried. A spelling suggestion requires SEND to confirm; ERASE clears it. SKIP and expiration award zero. The next prompt waits for NEXT PROMPT. Results show all answers, scores, and times. Sharing excludes questions and answers.

Refreshing preserves the absolute deadline; CONTINUE does not restart it. Refreshing a completed disk offers VIEW RESULTS. A midnight banner offers the new UTC disk without interrupting an already started challenge. Sample progress and official daily progress use separate storage keys. If storage is blocked, a notice explains that progress may be lost on refresh.

## Sample replay/reset

1. Open **http://127.0.0.1:4173/test/?sample=1** and play the sample.
2. On the final results screen choose **PLAY SAMPLE AGAIN**, then **CONFIRM RESET**. Choose **PLAY** to start the new run.
3. To abandon an unfinished sample, refresh to the start/continue screen and choose **RESET TEST GAME**, then confirm. Completed samples also offer this start-screen control.

CANCEL or Escape leaves progress intact. The dialog shows the exact sample storage key. Only the current sample's answers, score and deadline are removed; daily saves and other dates are untouched. The new run starts at prompt one with zero points, and its timer begins only on PLAY. Replay can be repeated without editing code or browser storage. An active timer continues while confirmation is open; cancelling does not grant more time.

## Hidden developer daily reset

1. Start the local server, then manually open **http://127.0.0.1:4173/test/dev-reset.html**. This page is not linked from the player interface.
2. Check the displayed UTC date and storage key. Click **RESET DAILY PROGRESS**.
3. Confirm the exact key with **CONFIRM RESET** (or CANCEL/Escape).
4. Choose **OPEN DAILY GAME**, then **PLAY**. A valid official puzzle for the current UTC date must exist; resetting does not supply a missing daily puzzle.

On an approved hosted build, use the same site's `/test/dev-reset.html` path. This address is **a development convenience, not secure owner authentication**. Anyone who knows it can reset their own browser's current daily progress. There is no password, backend, or cross-device control. The page clears only `floppio:v1:daily:YYYY-MM-DD`; sample saves, other dates, unrelated storage and the root landing page are unaffected. The date is selected when RESET DAILY PROGRESS is clicked and pinned to the confirmation, even if UTC midnight passes while the dialog is open.

Normal daily screens still have no reset/replay button and retain completed results. Use the utility in the same browser profile and origin as the game (localhost and 127.0.0.1 are different origins). Close other game tabs for reliable testing; already open updated tabs also discard their in-memory run when they receive the reset event. Storage failures are reported without claiming a successful reset. Older cached app tabs and simultaneous writes are not guaranteed to coordinate.

## Cityscape presentation

The existing Floppio skyline fills a tall, full-width background behind the playable game. A masked, fixed layer uses a larger image scale on desktop and a separate mobile crop. Nearly opaque game panels keep the timer, answers and results readable. Additional space below the game reveals the city on narrow screens. The artwork has no animation or pointer interaction; reduced-motion behavior remains in place. No landing-page files or original assets were edited.

## Files

- `test/index.html`, `test/game.css`: accessible responsive screens and terminal theme.
- `test/assets/`: copies of the existing logo, disk and skyline, making this directory portable.
- `test/js/app.js`: initialization, events, screen coordination, UTC rollover and reset synchronization.
- `test/js/puzzles.js`, `validation.js`: fetch and strict puzzle validation.
- `test/js/state.js`, `timing.js`, `scoring.js`: game transitions, deadlines and editorial points.
- `test/js/matching.js`: normalization, aliases and conservative confirmed suggestions.
- `test/js/storage.js`: guarded persistence, targeted removal and restoration.
- `test/js/reset.js`: confirmed single-key reset logic shared by sample and developer flows.
- `test/dev-reset.html`, `test/js/dev-reset.js`: unlinked current-UTC-daily reset utility.
- `test/js/view.js`, `sharing.js`: presentation and spoiler-free native/clipboard/manual sharing.
- `test/puzzles/YYYY-MM-DD.json`: external content; see [PUZZLE_SCHEMA.md](PUZZLE_SCHEMA.md).
- `test/tests/engine.test.js`, `test/tests/reset.test.js`: dependency-free gameplay and reset checks.
- `test/tools/serve.mjs`: local static preview server; not required by the website.
- [DEV_HANDOFF.md](DEV_HANDOFF.md): verification, limitations and remaining work.

The game uses relative paths throughout and can later move intact. Do not replace the current root landing page, change Pages/DNS settings, merge or publish without the owner's approval.
