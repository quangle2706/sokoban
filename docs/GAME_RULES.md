# Game rules

These rules are implemented in `src/engine/game.ts` and covered by
`tests/engine.test.ts`.

## Movement

- The player moves one cell up, down, left or right.
- Walls and anything outside the board (including `void` padding) block movement.
- Walking into a crate pushes it one cell in the same direction, if the cell
  beyond the crate is free floor or a free goal.
- A push is blocked if the cell beyond the crate is a wall, outside the
  board, or another crate. Two crates can never be pushed together.
- Crates are never pulled.
- Goals are terrain: they stay goals when a player or crate stands on them.

## Completion

- The level is solved when every crate stands on a goal.
- Once solved, further moves are rejected (`blocked` with reason `solved`).
  Undo and restart still work, so the winning move can be taken back.
- A stuck (deadlocked) crate does **not** end the level. The player can
  always undo or restart.

## Counters

| Event                  | moves | pushes |
| ---------------------- | ----- | ------ |
| Walk onto free floor   | +1    | —      |
| Push a crate           | +1    | +1     |
| Blocked attempt        | —     | —      |
| Undo                   | restored from the previous state | restored |
| Restart                | 0     | 0      |

## Undo and restart

- Only successful moves create history entries.
- Undo restores the previous player position, crate positions and both
  counters exactly.
- Restart returns to the initial layout with zero counters and **clears**
  the undo history.

## Coordinate convention

`x` = column (increases rightward), `y` = row (increases downward), `(0, 0)` =
top-left. Flat arrays are row-major: `index = y * width + x`. These are
logical cells, never pixels.

## Level text format

| Char  | Meaning           |
| ----- | ----------------- |
| `#`   | wall              |
| space | floor             |
| `.`   | goal              |
| `@`   | player on floor   |
| `+`   | player on goal    |
| `$`   | crate on floor    |
| `*`   | crate on goal     |

- Levels are stored as an array of row strings, so spaces are explicit.
- **Ragged rows** are normalized: missing trailing cells become `void`
  (outside the board), never floor.
- Floor outside the walls is allowed (for shaping) but is not drawn, and
  nothing may be placed there.

### Structural validation (`parseLevel`)

Rejected with a coded issue:

- `empty`: no rows
- `too-large`: larger than 64×64
- `unsupported-symbol`: any other character, reported with its position
- `player-count`: not exactly one player
- `no-crates`: no crates
- `crate-goal-mismatch`: crate count ≠ goal count
- `not-enclosed`: the player's walkable region reaches the map edge or a void cell
- `entity-outside-board`: a crate or goal outside the player's walkable region

**Structural validation does not prove a level is solvable.** Solvability is
shown separately by replaying an author solution (below).

## Author solutions

- Stored in `tests/fixtures/solutions.ts`. It is never imported by `src/`, so
  it never ships in the bundle; this was checked in the production build.
- Notation: LURD, where lowercase is a walk and uppercase is a push.
- `tests/levels.test.ts` replays each solution through the real engine. It
  checks that every step succeeds, that the walk/push case matches, that the
  level ends solved, and that the counters match the notation.
- `level-01`'s solution (51 moves, 15 pushes) came from the exhaustive BFS in
  `scripts/solve.ts`, so it is **move-optimal**. It is not claimed to be
  push-optimal.
