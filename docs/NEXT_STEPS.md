# Next steps

## Milestone status

- [x] **1. Engine, rendering, one level, keyboard/touch, undo, restart, completion**
- [ ] **2. Ten verified levels, level selection, unlocks, local saving, resume**
- [ ] 3. Home/settings, sound, motion polish, accessibility and responsive testing
- [ ] 4. Static deployment preparation and demo recording

## Milestone 2 plan

1. **Levels:** design 9 more original levels and check each with
   `node scripts/solve.ts`. Add each solution to
   `tests/fixtures/solutions.ts`. The existing level tests then cover them
   automatically. Aim for a gentle difficulty curve. Larger levels may outgrow
   the plain BFS solver; if so, switch to push-based search with a visited
   set over normalized player regions.
2. **Level selection screen** (HTML): numbered cards with locked, available
   and completed states, plus a line explaining that finishing a level unlocks
   the next.
3. **Completion dialog:** add "Màn tiếp theo" and "Chọn màn" once those
   destinations exist.
4. **`src/storage/`:** versioned save data (`{ version: 1, ... }`), validated
   on load, recovering gracefully from corrupt or incompatible data. Store:
   completed levels, current level plus a resumable state (initial state +
   move list, replayed through the engine on load), and the best run per
   level (fewest pushes, then fewest moves, recorded from one single run).
   Never store animation state.
5. **GameController:** support switching levels (`view.showLevel` already
   rebuilds the board).

## Known limitations / ideas

- Restart clears undo history (deliberate for now; see the exercise below).
- No deadlock detection (optional, later). Stuck crates never end the level.
- Reduced motion follows the OS setting only. A settings toggle comes in
  Milestone 3.
- If the browser throttles animation frames (e.g. a background tab), queued
  presses wait for the board to settle. Up to 4 fresh presses are kept;
  extra ones are dropped.
- The Phaser chunk is about 1.37 MB (357 kB gzipped). Consider a custom
  Phaser build in Milestone 4 if load time matters.
- The canvas has no per-cell accessibility. A text description of the board
  for screen readers could come in Milestone 3.

## Learning exercise

Make **restart undoable**: after pressing “Chơi lại”, one undo returns to the
position just before the restart. Write the failing test in
`tests/engine.test.ts` first.
