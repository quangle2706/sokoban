/// <reference types="node" />
/**
 * Author tool (not shipped to players): breadth-first search for a
 * move-optimal solution of a level, printed in LURD notation.
 *
 * Usage:  node scripts/solve.ts [levelId]
 *
 * It explores every reachable (player, crates) state, so it is only meant for
 * small hand-made levels. A result is move-optimal because BFS expands states
 * in order of move count; it is not necessarily push-optimal.
 */
import {
  createGame,
  DIRECTIONS,
  parseLevelOrThrow,
  tryMove,
  type Direction,
  type Game,
} from '../src/engine/index.ts';
import { LEVELS } from '../src/levels/levels.ts';

const LETTER: Record<Direction, string> = { up: 'u', down: 'd', left: 'l', right: 'r' };

function key(game: Game): string {
  const crates = game.state.crates.map((c) => `${c.x},${c.y}`).sort().join(';');
  return `${game.state.player.x},${game.state.player.y}|${crates}`;
}

export function solve(start: Game, maxStates = 2_000_000): { path: string; explored: number } | null {
  const seen = new Set<string>([key(start)]);
  let frontier: { game: Game; path: string }[] = [{ game: start, path: '' }];
  while (frontier.length > 0) {
    const next: typeof frontier = [];
    for (const node of frontier) {
      for (const d of DIRECTIONS) {
        const r = tryMove(node.game, d);
        if (r.kind === 'blocked') continue;
        const letter = r.kind === 'pushed' ? LETTER[d].toUpperCase() : LETTER[d];
        if (r.solved) return { path: node.path + letter, explored: seen.size };
        const k = key(r.game);
        if (seen.has(k)) continue;
        seen.add(k);
        if (seen.size > maxStates) return null;
        next.push({ game: r.game, path: node.path + letter });
      }
    }
    frontier = next;
  }
  return null;
}

function main(): void {
  const id = process.argv[2];
  for (const def of LEVELS.filter((l) => !id || l.id === id)) {
    const result = solve(createGame(parseLevelOrThrow(def.map)));
    if (!result) {
      console.log(`${def.id}: no solution found`);
      continue;
    }
    const pushes = [...result.path].filter((c) => c === c.toUpperCase()).length;
    console.log(`${def.id}: ${result.path.length} moves, ${pushes} pushes, ${result.explored} states explored`);
    console.log(result.path);
  }
}

// Only run the CLI when executed directly, not when imported.
if ((import.meta as ImportMeta & { main?: boolean }).main) main();
