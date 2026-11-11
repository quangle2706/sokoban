# Kho Nhỏ

An original, cozy, top-down Sokoban-style puzzle game for the web.
Push every crate onto a goal. All player-facing text is Vietnamese.

**Status: Milestone 1** — puzzle engine, one playable level, keyboard + touch
controls, undo, restart, completion overlay. See [docs/NEXT_STEPS.md](docs/NEXT_STEPS.md).

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
node scripts/solve.ts            # author tool: BFS-solve every bundled level
node scripts/solve.ts level-01   # ...or one level
```

## Controls

| Action  | Keyboard               | Touch / mouse        |
| ------- | ---------------------- | -------------------- |
| Move    | Arrow keys or W A S D  | Direction pad        |
| Undo    | Z, U or Backspace      | “Hoàn tác” button    |
| Restart | R                      | “Chơi lại” button    |

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
  app/      GameController: wires input -> engine -> renderer/UI
tests/      Vitest suites + author-only solutions (tests/fixtures)
scripts/    author tools (BFS solver)
docs/       rules, architecture, next steps
```

`src/storage/` and `src/audio/` will be added in Milestones 2 and 3, when
there is something real to put in them.

## Documentation

- [docs/GAME_RULES.md](docs/GAME_RULES.md) — rules, counters, level format
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — module boundaries and data flow
- [docs/NEXT_STEPS.md](docs/NEXT_STEPS.md) — roadmap and known limitations
