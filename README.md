# Kho Nhỏ

An original, cozy, top-down Sokoban-style puzzle game for the web.
Push every crate onto a goal. All player-facing text is Vietnamese.

**Status: Milestone 3.** Ten original levels with verified solutions, a
Home screen, level picker with unlocks, how-to page, and settings for sound,
reduced motion and resetting progress. Sound effects are synthesized in the
browser, with no audio files. Progress is saved in this browser, including
unfinished runs with their undo history. See [docs/NEXT_STEPS.md](docs/NEXT_STEPS.md).

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
| Menu    | Esc (in game); Esc again goes back | “Menu” button   |
| Level picker | Arrow keys between cards, Enter to play | Tap a card |

Holding a direction (key or button) moves once, then repeats after 260 ms
every 140 ms.

## Stack

TypeScript · Phaser 4 (rendering only) · Vite · Vitest. No UI framework: the
HUD, buttons, screens and dialogs are plain, accessible HTML/CSS.

## Project layout

```
src/
  engine/   pure, deterministic puzzle logic (no Phaser, no DOM)
  levels/   player-facing level definitions
  scenes/   Phaser renderer behind the BoardView interface
  ui/       DOM HUD, input controller, completion dialog, Vietnamese strings
  storage/  versioned save format, pure progress rules, localStorage adapter
  audio/    synthesized sound effects (Web Audio API, no files)
  app/      App (screens, levels, saving) + GameController (input -> engine -> view)
tests/      Vitest suites + author-only solutions (tests/fixtures)
scripts/    author tools (BFS solver)
docs/       rules, architecture, next steps
```

## Documentation

- [docs/GAME_RULES.md](docs/GAME_RULES.md) — rules, counters, level format
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — module boundaries and data flow
- [docs/ACCESSIBILITY.md](docs/ACCESSIBILITY.md) — what was checked, and what still needs real devices
- [docs/NEXT_STEPS.md](docs/NEXT_STEPS.md) — roadmap and known limitations
