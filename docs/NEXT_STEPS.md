# Next steps

## Milestone status

- [x] **1. Engine, rendering, one level, keyboard/touch, undo, restart, completion**
- [x] **2. Ten verified levels, level selection, unlocks, local saving, resume**
- [x] **3. Home/settings, sound, motion polish, accessibility and responsive testing**
  (real-device and screen-reader checks are listed as open in
  [ACCESSIBILITY.md](ACCESSIBILITY.md))
- [x] **4. Static deployment preparation and demo recording**
  (live at https://quangle2706.github.io/sokoban/, deployed by CI from `main`)

## Milestone 4 outcome

Done:
- **CI/CD:** a GitHub Actions workflow tests and builds every push and PR,
  and deploys `main` to GitHub Pages.
- **Production polish:**
  - Inline loading splash with a startup watchdog that also covers a failed
    bundle download.
  - `<noscript>` message.
  - Web manifest with procedural icons, including a maskable icon and an
    Apple touch icon.
  - Service worker for offline play.
  - `_headers` for Netlify and Cloudflare.
- **Bundle measured:** about 370 kB gzipped in total, of which Phaser is
  about 352 kB. Not optimised yet; see below.
- **Docs:** [DEPLOYMENT.md](DEPLOYMENT.md), [DEMO.md](DEMO.md) (shot
  list), README screenshots and credits.
- **Demo:** recorded as `docs/media/demo.gif` and shown in the README.

Still to do (needs the repository owner or a device):
1. ~~Enable GitHub Pages~~: done. The site went live on 2026-11-12; the
   first two runs failed only because Pages was not enabled yet.
2. **Real-device and screen-reader pass:** see the open list in
   ACCESSIBILITY.md.
3. **Choose a licence:** the repo has none yet, which means "all rights
   reserved" by default. Add a `LICENSE` file if others should be able to
   reuse the code.

## Ideas after the MVP

- **Smaller first load:** a custom Phaser build, or rendering the board
  without Phaser at all. The board is simple shapes and tweens, which a
  plain `<canvas>` renderer behind the existing `BoardView` interface could
  handle in a few kB.
- **More content:** levels 11–30 were added after the MVP. Further levels
  should follow the same process: draft by hand, prove with
  `scripts/solve.ts`, and add the solution to `tests/fixtures/solutions.ts`.
  On a 320 px phone the widest boards (11 columns) get about 25 px tiles,
  so 11×11 is a sensible size limit.
- **Undoable restart** (exercise from Milestone 1) and a move-history replay
  of your best run.
- **Deadlock hints** (optional): gently mark crates that can no longer reach
  a goal.

## Known limitations / ideas

- Restart clears undo history (see the Milestone 1 exercise).
- No deadlock detection; stuck crates never end a level.
- Two open tabs both write the same save, and the last write wins.
- Locked level names are hidden on purpose. Revisit if screen-reader users
  find it confusing.
- If the browser throttles animation frames (seen at 2–12 fps in automated
  test tabs), glides and the celebration slow down. Up to 4 fresh presses
  wait in a queue; any beyond that are dropped.
- On a very short landscape screen (about 680×320), Home needs a few pixels
  of scrolling for its footer line.
- Dev tip (Windows): if `npm run dev` says port 5173 is in use, an earlier
  Vite process is probably still running. Stop that `node.exe` process
  (e.g. in Task Manager), or start with `npx vite --port 5174`.

## Learning exercises

- **Milestone 1:** make restart undoable.
- **Milestone 2:** show the best run in the HUD on completed levels.
- **Milestone 4:** write a second `BoardView` implementation using the
  plain Canvas 2D API (no Phaser) and switch to it in `main.ts`. Compare the
  bundle size with `npm run build`. Which parts of the app did you have to
  change, and why so few?
- **Milestone 3:** add a `vibrate` feedback channel. On devices that support
  `navigator.vibrate`, give a short buzz on `blocked` and a pattern on
  `win`, controlled by a new setting. It should need no change to
  `GameController`. Ask yourself why.
