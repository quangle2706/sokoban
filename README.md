# Kho Nhỏ

An original, cozy, top-down Sokoban-style puzzle game for the web.
Push every crate onto a goal. All player-facing text is Vietnamese.

**Status: Milestone 2.** Ten original levels with verified solutions, a level
picker with unlocks, and progress saved in this browser (including resuming
an unfinished run with its undo history). See [docs/NEXT_STEPS.md](docs/NEXT_STEPS.md).

## Requirements

- Node.js 20.19+ (developed on Node 24, which can also run the engine
  scripts directly without a build step)
- npm

## Setup and commands

```bash
npm install          # install exact pinned versions from package-lock.json
npm run dev          # dev server at http://localhost:5173
npm test             # Vitest: pure engine + level tests (no browser needed)
npm run typecheck    # tsc --noEmit
npm run build        # typecheck + production build into dist/
npm run preview      # serve the production build locally
node scripts/solve.ts                  # author tool: push-optimal search, all levels
node scripts/solve.ts --moves goc-kho  # move-optimal search for one level
```

## Controls

| Action  | Keyboard               | Touch / mouse        |
| ------- | ---------------------- | -------------------- |
| Move    | Arrow keys or W A S D  | Direction pad        |
| Undo    | Z, U or Backspace      | “Hoàn tác” button    |
| Restart | R                      | “Chơi lại” button    |
| Levels  | Tab to “Chọn màn”, Esc to go back | “Chọn màn” button |

Holding a direction (key or button) moves once, then repeats after 260 ms
every 140 ms.

## Stack

TypeScript · Phaser 4 (rendering only) · Vite · Vitest. No UI framework: the
HUD, buttons and dialog are plain, accessible HTML/CSS.

## Project layout

```
src/
  engine/   pure, deterministic puzzle logic (no Phaser, no DOM)
  levels/   player-facing level definitions
  scenes/   Phaser renderer behind the BoardView interface
  ui/       DOM HUD, input controller, completion dialog, Vietnamese strings
  storage/  versioned save format, pure progress rules, localStorage adapter
  app/      App (screens, levels, saving) + GameController (input -> engine -> view)
tests/      Vitest suites + author-only solutions (tests/fixtures)
scripts/    author tools (BFS solver)
docs/       rules, architecture, next steps
```

`src/audio/` will be added in Milestone 3, along with sound.

## Documentation

- [docs/GAME_RULES.md](docs/GAME_RULES.md) — rules, counters, level format
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — module boundaries and data flow
- [docs/NEXT_STEPS.md](docs/NEXT_STEPS.md) — roadmap and known limitations
