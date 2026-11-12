# Next steps

## Milestone status

- [x] **1. Engine, rendering, one level, keyboard/touch, undo, restart, completion**
- [x] **2. Ten verified levels, level selection, unlocks, local saving, resume**
- [x] **3. Home/settings, sound, motion polish, accessibility and responsive testing**
  (real-device and screen-reader checks are listed as open in
  [ACCESSIBILITY.md](ACCESSIBILITY.md))
- [ ] **4. Static deployment preparation and demo recording**

## Milestone 4 plan

1. **Static hosting:** `npm run build` already produces a self-contained
   `dist/` with relative paths (`base: './'`). Pick a host (GitHub Pages,
   Netlify or Cloudflare Pages) and add a deploy workflow that runs
   `npm ci`, `npm test` and `npm run build` before publishing.
2. **Production polish:**
   - App icons and a web manifest (installable, offline-friendly). Decide
     whether a service worker is worth it.
   - A `<noscript>` message.
   - An error fallback if WebGL/Canvas fails.
   - Check cache headers for hashed assets.
3. **Bundle size:** the Phaser chunk is about 1.37 MB (357 kB gzipped).
   Measure first load on a slow connection, then consider a custom Phaser
   build or lazy-loading Phaser behind the Home screen.
4. **Real-device pass:** work through the "Not yet verified" list in
   ACCESSIBILITY.md on real phones and with a screen reader.
5. **Demo recording:** a short capture showing a level start, push, undo, a
   win with the celebration, the level picker, and settings with reduced
   motion.
6. **README:** add the live URL, a screenshot, and a short credits/licence
   section. All assets are procedural, so there are no third-party assets
   to credit.

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
- **Milestone 3:** add a `vibrate` feedback channel. On devices that support
  `navigator.vibrate`, give a short buzz on `blocked` and a pattern on
  `win`, controlled by a new setting. It should need no change to
  `GameController`. Ask yourself why.
