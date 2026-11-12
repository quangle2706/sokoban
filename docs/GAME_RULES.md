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
- Each entry records what the exhaustive searches in `scripts/solve.ts`
  proved when the level was made: `moveOptimal` (the stored solution has
  the fewest possible moves) and `minPushes` (the fewest pushes any
  solution needs). The test checks the replay never uses fewer pushes than
  `minPushes`. Re-run the solver after editing a map.

## The thirty levels

All original designs. Difficulty is ordered by how many states the
move-optimal search had to explore, a rough proxy for how much planning a
level needs. Levels 11–30 were added after the MVP. They restart a little
easier than level 10 (as a breather) and then climb to the hardest levels
in the game.

| # | id          | Name          | Crates | Fewest moves | Fewest pushes | States searched |
| - | ----------- | ------------- | ------ | ------------ | ------------- | --------------- |
| 1 | buoc-dau    | Bước đầu      | 2 | 5  | 2  | 121     |
| 2 | hai-ben     | Hai bên       | 2 | 15 | 4  | 290     |
| 3 | goc-nho     | Góc nhỏ       | 2 | 16 | 5  | 938     |
| 4 | loi-hep     | Lối hẹp       | 2 | 19 | 3  | 1,345   |
| 5 | ke-hang     | Kệ hàng       | 3 | 29 | 10 | 46,502  |
| 6 | nga-re      | Ngã rẽ        | 3 | 38 | 8  | 34,504  |
| 7 | hanh-lang   | Hành lang dài | 4 | 57 | 18 | 177,779 |
| 8 | bac-thang   | Bậc thang     | 4 | 50 | 11 | 233,475 |
| 9 | doi-xung    | Đối xứng      | 4 | 38 | 8  | 503,406 |
| 10 | goc-kho    | Góc kho       | 4 | 51 | 15 | 611,213 |
| 11 | bang-chuyen | Băng chuyền | 3 | 39 | 12 | 20,444 |
| 12 | cua-sau | Cửa sau | 3 | 33 | 6 | 54,095 |
| 13 | hai-day-ke | Hai dãy kệ | 4 | 30 | 6 | 98,144 |
| 14 | chu-u | Chữ U | 4 | 34 | 8 | 110,775 |
| 15 | nga-tu | Ngã tư | 4 | 24 | 6 | 150,521 |
| 16 | gac-xep | Gác xép | 4 | 38 | 12 | 160,060 |
| 17 | thap-hang | Tháp hàng | 4 | 33 | 15 | 230,753 |
| 18 | ban-co | Bàn cờ | 4 | 43 | 16 | 344,848 |
| 19 | loi-vong | Lối vòng | 4 | 59 | 11 | 434,163 |
| 20 | hang-rao | Hàng rào | 4 | 32 | 8 | 490,133 |
| 21 | hai-tang | Hai tầng | 4 | 54 | 11 | 575,514 |
| 22 | bac-cua | Bậc cửa | 4 | 30 | 7 | 644,751 |
| 23 | chia-doi | Chia đôi | 4 | 42 | 10 | 729,733 |
| 24 | goc-khuat | Góc khuất | 4 | 46 | 13 | 967,811 |
| 25 | me-cung-nho | Mê cung nhỏ | 4 | 78 | 21 | 2,389,572 |
| 26 | kho-dong | Kho phía đông | 4 | 91 | 26 | 3,101,596 |
| 27 | cot-tru | Cột trụ | 5 | ≤ 56* | 8 | 30,606 (push) |
| 28 | day-kho-dai | Dãy kho dài | 5 | ≤ 97* | 17 | 31,383 (push) |
| 29 | ngo-cut | Ngõ cụt | 5 | ≤ 102* | 16 | 46,605 (push) |
| 30 | tong-kho | Tổng kho | 5 | ≤ 204* | 32 | 138,281 (push) |

\* For the four 5-crate levels (27–30) the move-optimal search did not
finish within 5 million states, so the stored solution comes from the
push-optimal search. Its move count is an upper bound, not the minimum, and
"states searched" is the push search's count, which is not comparable to
the move search numbers. The minimum push counts are still proven.

"Fewest moves" and "fewest pushes" come from two separate searches, so one
solution need not achieve both (e.g. Đối xứng: 38 moves uses 10 pushes;
8 pushes needs more moves).

## Progression and saving

- **Unlocks:** level 1 is always open. Finishing level N opens level N+1. A
  finished level stays open and can be replayed at any time.
- **Best run:** fewest pushes, with fewest moves breaking ties. Both numbers
  always come from one single run and are never mixed across runs. Undoing
  within a run is fine; the counters already reflect the undo.
- **Resume:** every level keeps its own unfinished run. Switching levels and
  coming back, or reloading the page, continues where you left off, and undo
  still works. Restart clears that level's saved run.
- **On launch** the game opens the last level you were on (or, after a win,
  the next one). A saved level that is unknown or locked is ignored, and the
  first open unfinished level is used instead.
- Progress lives only in this browser on this device. There is no account
  and no sync.
- **Settings** (sound, motion) are saved with progress. **Reset progress**
  (Settings, with confirmation) clears completions, bests and unfinished
  runs, but keeps settings. Saves from before settings existed load with
  the defaults: sound on, motion following the device.
