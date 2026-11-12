# Next steps

## Milestone status

- [x] **1. Engine, rendering, one level, keyboard/touch, undo, restart, completion**
- [x] **2. Ten verified levels, level selection, unlocks, local saving, resume**
- [ ] **3. Home/settings, sound, motion polish, accessibility and responsive testing**
- [ ] 4. Static deployment preparation and demo recording

## Milestone 3 plan

1. **Home screen** (HTML): "Chơi tiếp" (opens `startingLevelIndex`),
   "Chọn màn", "Hướng dẫn", "Cài đặt". Launch should open Home instead of
   going straight into a level.
2. **How-to-play screen:** rules, symbols (goal diamond, check-marked crate)
   and controls, in Vietnamese.
3. **Settings screen:**
   - Sound on/off.
   - Reduced motion: system default / on / off. Today `BoardScene` reads a
     `reducedMotion()` function; point it at the setting.
   - Reset progress, behind a confirmation dialog.

   Store settings in the save data. Adding an optional `settings` field with
   defaults needs no version bump; changing existing fields does.
4. **`src/audio/`:** small synthesized sounds (Web Audio, no downloads) for
   step, push, blocked and win. They must respect the sound setting and
   browser autoplay rules (start only after a user gesture).
5. **Motion polish:** a gentle win effect that is skipped under reduced
   motion.
6. **Accessibility pass:** keyboard-only run-through of every screen,
   screen-reader labels, contrast check, arrow-key movement between level
   cards, and an optional text description of the board.
7. **Responsive testing:** real phones (iOS Safari, Android Chrome) plus
   Firefox and Safari on desktop.

## Known limitations / ideas

- Restart clears undo history (see the Milestone 1 exercise).
- No deadlock detection; stuck crates never end a level.
- Two open tabs both write the same save, and the last write wins. A
  `storage` event listener could sync them.
- Locked level names are hidden on purpose (a small surprise). Reconsider
  during the accessibility pass.
- If the browser throttles animation frames (seen at 2–12 fps in an
  automated test tab), glides slow down. Up to 4 fresh presses wait in a
  queue; any beyond that are dropped.
- The Phaser chunk is about 1.37 MB (357 kB gzipped). Consider a custom
  Phaser build in Milestone 4.
- `scripts/solve.ts` copes with these small levels. Much larger levels would
  need deadlock patterns or an A* heuristic.

## Learning exercises

- **Milestone 1:** make restart undoable.
- **Milestone 2:** show the best run in the HUD while playing a completed
  level (e.g. "Kỷ lục: 4 đẩy · 15 bước"). The data is already in
  `SaveData.completed`; decide which layer should pass it to the `Hud`, and
  why.
