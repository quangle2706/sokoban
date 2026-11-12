# Architecture

## Layers

```
┌─────────────── src/ui ───────────────┐      ┌──────── src/scenes ────────┐
│ InputController  (keys, buttons)     │      │ BoardView (interface)      │
│ Hud, CompletionDialog, strings (vi)  │      │ BoardScene (Phaser impl)   │
└───────────────┬──────────────────────┘      │ textures (procedural art)  │
                │ Command                      └────────────▲───────────────┘
                ▼                                           │ sync(state)
        ┌──────────── src/app ─────────────┐                │
        │ GameController (owns the Game)   │────────────────┘
        └───────────────┬──────────────────┘
                        │ pure function calls
                        ▼
        ┌──────────── src/engine ──────────┐
        │ parseLevel · tryMove · undo ·    │   no Phaser, no DOM.
        │ restart · isSolved · replay      │   Runs in Node and Vitest.
        └──────────────────────────────────┘
```

```
        ┌──────────── src/storage ─────────┐
        │ saveData (format + validation)   │   pure; tests run in Node
        │ progress (unlocks, best, resume) │
        │ saveStore (localStorage adapter) │   the only browser-API user
        └──────────────────────────────────┘
```

Dependency rule: `engine` imports nothing from other layers. `storage` uses
only the engine. `scenes` and `ui` import engine/storage *types*. `app` is
the only layer that combines them:

- `App` owns screens (game, level picker, completion), the loaded level and
  the `SaveData` value, and persists after every change.
- `GameController` owns the current `Game` for one level and reports changes
  to `App` through two hooks: `onChange(game, solved)` runs immediately, and
  `onCompletionShown(game)` runs after the winning glide.

## Engine (`src/engine`)

- **Static terrain** (`Level.terrain`: wall/floor/goal/void) is separate from
  **dynamic state** (`GameState`: player, crates, moves, pushes).
- All operations are pure and return new objects. A blocked move returns the
  *same* `Game` reference, which makes "nothing changed" cheap to detect and
  test.
- `Game.history` is an array of previous `GameState` values. Because states
  are immutable, undo is simply "pop the last state".
- Crates keep a stable array index, so the renderer can map crate *i* to the
  same sprite across moves, undo and restart.
- `tryMove` returns a discriminated union:
  `blocked` (with `reason`: `wall` | `crate` | `solved`), `moved`, or
  `pushed` (with `crateIndex`). `moved` and `pushed` also carry `solved`.
- Imports use explicit `.ts` extensions with `erasableSyntaxOnly`, so Node 24
  can run engine code directly (`node scripts/solve.ts`) with no build step.

## Data flow: one key press

1. `InputController` maps `ArrowRight` → `{ type: 'move', direction: 'right', repeat: false }`.
   It ignores typing in form controls, modifier combos, IME composition, keys
   inside dialogs, and the browser's own auto-repeat.
2. `GameController.handle()`:
   - Ignores everything while the completion dialog is open.
   - If the board is animating, queues fresh presses (FIFO, max 4) and drops
     held-key repeats.
   - Calls `tryMove(game, 'right')` and stores the returned `Game`.
3. On `blocked`, it asks the view for a cosmetic `bump`. Otherwise it updates
   the HUD counters and calls `view.sync(state, { animate: true }, onSettled)`.
4. `BoardScene.sync` tweens each sprite whose cell changed (110 ms) and then
   calls `onSettled`.
   Before the glide starts, `onChange` lets `App` save the run (or record
   the win).
5. `onSettled` either asks `App` to show the completion dialog (if
   `solved`) or runs the next queued command.

Undo uses the same path, so its animation is the reverse glide. Restart
snaps without animation and clears the queue.

## Saving (`src/storage`)

- **Format:** `{ version: 1, completed, inProgress, currentLevelId }`
  under the key `kho-nho/save`.
- **Resumable runs are stored as LURD notation.** `notationOf(game)` derives
  it from the undo history. On load, `resumeGame` replays it through the
  engine, which rebuilds the state *and* the undo history, and rejects runs
  that no longer fit the level (for example after a map edit). No positions
  or animation state are stored.
- **Saving is immediate.** `onChange` fires before the glide starts, so
  closing the page mid-animation loses nothing. A win is recorded at that
  moment too, not when the dialog appears.
- **Validation** (`parseSave`) never throws:
  - `fresh`: nothing saved yet.
  - `loaded`: read without problems.
  - `repaired`: individual bad entries dropped, the rest kept, short notice shown.
  - `reset`: unreadable or unknown version. The raw text is copied to
    `kho-nho/save-unreadable`, play starts fresh, and a notice explains it.
- **No storage available** (private mode, blocked, full): the game plays
  normally, and a single notice says progress cannot be saved.
- **Versioning:** a future format bumps `SAVE_VERSION` and adds a migration
  step in `parseSave`.

## Screens

Every screen besides gameplay is a native modal `<dialog>`:

| Dialog | Opened from | Notes |
| ------ | ----------- | ----- |
| `home` | launch, Menu button, Esc in game | "Chơi tiếp" goes to the loaded level, or the next one if it is solved |
| `level-select` | Home, completion | arrow keys move between cards |
| `howto` | Home | the legend uses `view.tileImage()`, so it shows the real tiles |
| `settings` | Home | sound, motion, reset progress |
| `confirm-reset` | Settings | focus starts on "Hủy" |
| `completion` | a win | shown after the celebration |

Opening a dialog on top of another forms a back stack for free: Esc or
"Quay lại" closes the top one, and focus returns to the button that opened
it. One rule, `App.updatePause()`, pauses gameplay whenever *any* dialog is
open. While paused, the key handler returns before `preventDefault`, so keys
behave normally inside dialogs. Locked levels are plain list items, not
disabled buttons, so no screen has a button that does nothing.

## Feedback: sound and motion

- `GameController` emits `GameFeedback` events (`step`, `push`, `goal`,
  `blocked`, `undo`, `restart`, `win`) through a hook. `App` forwards them
  to `SoundPlayer`. The controller knows nothing about audio, and a
  different feedback channel (vibration, captions) could listen to the same
  events.
- `SoundPlayer` synthesizes each sound from short oscillator envelopes. The
  `AudioContext` is created on the first key press or tap, because browsers
  block audio before a user gesture. If Web Audio is missing, every call
  does nothing. Blocked-move sounds only play on fresh presses, never while
  a key is held against a wall.
- `MotionSetting` turns the preference (`system`, `reduce` or `full`) plus
  the OS `prefers-reduced-motion` into one boolean. That flag drives both
  the Phaser renderer (glides, bump, goal pulse, win celebration) and CSS,
  through `<html data-reduced-motion>`. Rules and the command path are
  identical either way.
- On a win: glide → `win` sound → `view.celebrate()` → completion dialog.
  If the player undoes during the celebration, `sync()` cancels it and the
  dialog is not shown.

## Rendering (`src/scenes`)

- `BoardView` is the renderer contract. `BoardScene` is the Phaser version.
  A sprite-based or test renderer only needs to implement `BoardView`.
- Textures are drawn once with Phaser `Graphics` and registered under keys
  (`TEX.*`). To switch to sprite art, load images under the same keys.
- Everything is laid out in *board units* (1 tile = 128 units) inside one
  container. On resize, only the container's scale and position change, so
  game state is never touched.
- **Crisp on high-DPI screens:** `main.ts` sizes the canvas drawing buffer to
  CSS size × `devicePixelRatio`, with Phaser zoom `1/dpr`. Phaser's own input
  is disabled (all controls are HTML), so this mismatch is harmless.
- Floor is drawn only inside the player's walkable region, so spaces outside
  the walls show the page background.

## UI (`src/ui`)

- Plain HTML in `index.html`, styled by `src/styles.css`. Real `<button>`s
  provide focus, keyboard activation and screen-reader labels.
- The completion overlay is a native `<dialog>` (`showModal`), which gives
  focus trapping, Esc to close and focus restoration.
- An `aria-live` region announces win, undo and restart.
- **Responsive:** single column on portrait screens (HUD, board, controls).
  At aspect ratios of 5:4 or wider, the controls move beside the board. Safe-area insets
  are respected, touch targets are at least 44 px, the D-pad uses
  `touch-action: none`, and no gestures are required.

## Input timing

| Constant             | Value  | Where                     |
| -------------------- | ------ | ------------------------- |
| Move animation       | 110 ms | `BoardScene.MOVE_DURATION_MS` |
| Held repeat: delay   | 260 ms | `input.ts REPEAT_DELAY_MS`    |
| Held repeat: interval| 140 ms | `input.ts REPEAT_INTERVAL_MS` |
| Queued fresh presses | 4      | `GameController MAX_QUEUED`   |

Reduced motion (OS `prefers-reduced-motion`) makes `sync` place sprites
instantly and disables the bump. The rules and the command path stay the
same.

## Debug handle

In dev builds only, `window.__khoNho.controller.current` exposes the current
`Game`. It is stripped from production builds (`import.meta.env.DEV`).
