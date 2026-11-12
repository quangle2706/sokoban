/// <reference types="node" />
/**
 * Author tool (never shipped to players): exhaustive breadth-first solvers.
 *
 * Usage:
 *   node scripts/solve.ts                 # push-optimal search, every level
 *   node scripts/solve.ts goc-kho         # one level
 *   node scripts/solve.ts --moves goc-kho # move-optimal search (small levels)
 *
 * Two searches, two different guarantees:
 *   - solveMoves: BFS over (player cell, crates). The result has the fewest
 *     possible MOVES. The state space grows quickly, so use it on small levels.
 *   - solvePushes: BFS over (player region, crates), where all cells the
 *     player can walk between without pushing count as one state. The result
 *     has the fewest possible PUSHES. The walks between pushes are shortest
 *     for that push sequence, but the total move count is not guaranteed
 *     minimal.
 *
 * Every result is replayed through the real engine before it is reported.
 */
import {
  createGame,
  DIRECTIONS,
  isWalkableTerrain,
  parseLevelOrThrow,
  replaySolution,
  tryMove,
  type Direction,
  type Game,
  type Level,
} from '../src/engine/index.ts';
import { LEVELS } from '../src/levels/levels.ts';

const LETTER: Record<Direction, string> = { up: 'u', down: 'd', left: 'l', right: 'r' };

export type SolveResult =
  | { readonly status: 'solved'; readonly path: string; readonly explored: number }
  | { readonly status: 'unsolvable'; readonly explored: number }
  | { readonly status: 'gave-up'; readonly explored: number };

// ---------------------------------------------------------------------------
// Move-optimal BFS (uses the engine directly; simple but slow).
// ---------------------------------------------------------------------------

function moveKey(game: Game): string {
  const crates = game.state.crates.map((c) => `${c.x},${c.y}`).sort().join(';');
  return `${game.state.player.x},${game.state.player.y}|${crates}`;
}

export function solveMoves(start: Game, maxStates = 3_000_000): SolveResult {
  const seen = new Set<string>([moveKey(start)]);
  let frontier: { game: Game; path: string }[] = [{ game: start, path: '' }];
  while (frontier.length > 0) {
    const next: typeof frontier = [];
    for (const node of frontier) {
      for (const d of DIRECTIONS) {
        const r = tryMove(node.game, d);
        if (r.kind === 'blocked') continue;
        const letter = r.kind === 'pushed' ? LETTER[d].toUpperCase() : LETTER[d];
        if (r.solved) return { status: 'solved', path: node.path + letter, explored: seen.size };
        const k = moveKey(r.game);
        if (seen.has(k)) continue;
        seen.add(k);
        if (seen.size > maxStates) return { status: 'gave-up', explored: seen.size };
        next.push({ game: r.game, path: node.path + letter });
      }
    }
    frontier = next;
  }
  return { status: 'unsolvable', explored: seen.size };
}

// ---------------------------------------------------------------------------
// Push-optimal BFS (own compact representation for speed).
// ---------------------------------------------------------------------------

export function solvePushes(level: Level, maxStates = 6_000_000): SolveResult {
  const W = level.width;
  const size = level.width * level.height;
  const open = level.terrain.map(isWalkableTerrain);
  const goal = level.terrain.map((t) => t === 'goal');
  const delta: Record<Direction, number> = { up: -W, down: W, left: -1, right: 1 };
  // Cells on the outer border are never walkable in a validated level, so
  // index arithmetic never wraps into a neighbouring row through open cells.

  // Simple dead squares: a non-goal cell from which a crate can never reach
  // any goal (computed by "pulling" from goals). Pruning them is safe.
  const live = new Array<boolean>(size).fill(false);
  const stack: number[] = [];
  goal.forEach((g, i) => {
    if (g) {
      live[i] = true;
      stack.push(i);
    }
  });
  while (stack.length > 0) {
    const c = stack.pop()!;
    for (const d of DIRECTIONS) {
      const from = c - delta[d]; // crate came from here, pushed in direction d
      const player = from - delta[d];
      if (open[from] && open[player] && !live[from]) {
        live[from] = true;
        stack.push(from);
      }
    }
  }

  const reach = (player: number, crates: Set<number>): { cells: Int32Array; min: number } => {
    const prev = new Int32Array(size).fill(-2);
    prev[player] = -1;
    const queue = [player];
    let min = player;
    for (let qi = 0; qi < queue.length; qi++) {
      const c = queue[qi]!;
      if (c < min) min = c;
      for (const d of DIRECTIONS) {
        const n = c + delta[d];
        if (open[n] && prev[n] === -2 && !crates.has(n)) {
          prev[n] = c;
          queue.push(n);
        }
      }
    }
    return { cells: prev, min };
  };

  interface Node {
    crates: number[]; // sorted
    player: number; // actual player cell after the last push
    parent: number;
    pushFrom: number; // crate cell before the push
    dir: Direction | null;
  }
  const startCrates = level.initialCrates.map((c) => c.y * W + c.x).sort((a, b) => a - b);
  const startPlayer = level.initialPlayer.y * W + level.initialPlayer.x;
  const nodes: Node[] = [{ crates: startCrates, player: startPlayer, parent: -1, pushFrom: -1, dir: null }];
  const keyOf = (crates: number[], canon: number) => `${canon}|${crates.join(',')}`;
  const seen = new Set<string>([keyOf(startCrates, reach(startPlayer, new Set(startCrates)).min)]);

  for (let ni = 0; ni < nodes.length; ni++) {
    const node = nodes[ni]!;
    const crateSet = new Set(node.crates);
    const { cells } = reach(node.player, crateSet);
    for (const crate of node.crates) {
      for (const d of DIRECTIONS) {
        const behind = crate - delta[d];
        const target = crate + delta[d];
        if (cells[behind] === -2 || !open[target] || crateSet.has(target) || !live[target]) continue;
        const crates = node.crates.map((c) => (c === crate ? target : c)).sort((a, b) => a - b);
        const child: Node = { crates, player: crate, parent: ni, pushFrom: crate, dir: d };
        if (crates.every((c) => goal[c])) {
          nodes.push(child);
          return { status: 'solved', path: reconstruct(nodes.length - 1), explored: seen.size };
        }
        const k = keyOf(crates, reach(crate, new Set(crates)).min);
        if (seen.has(k)) continue;
        seen.add(k);
        if (seen.size > maxStates) return { status: 'gave-up', explored: seen.size };
        nodes.push(child);
      }
    }
  }
  return { status: 'unsolvable', explored: seen.size };

  function reconstruct(index: number): string {
    const chain: Node[] = [];
    for (let i = index; i > 0; i = nodes[i]!.parent) chain.push(nodes[i]!);
    chain.reverse();
    let player = startPlayer;
    let crates = new Set(startCrates);
    let path = '';
    for (const step of chain) {
      const d = step.dir!;
      const behind = step.pushFrom - delta[d];
      // Shortest walk from player to `behind`, then one push.
      const { cells } = reach(player, crates);
      const walk: string[] = [];
      for (let c = behind; c !== player; c = cells[c]!) {
        const p = cells[c]!;
        const dir = DIRECTIONS.find((x) => p + delta[x] === c)!;
        walk.push(LETTER[dir]);
      }
      path += walk.reverse().join('') + LETTER[d].toUpperCase();
      crates = new Set([...crates].map((c) => (c === step.pushFrom ? step.pushFrom + delta[d] : c)));
      player = step.pushFrom;
    }
    return path;
  }
}

// ---------------------------------------------------------------------------

export function describe(level: Level, result: SolveResult): string {
  if (result.status !== 'solved') return `${result.status} after ${result.explored} states`;
  const replay = replaySolution(level, result.path);
  if (!replay.ok || !replay.solved) throw new Error(`Solver bug: path does not replay (${result.path})`);
  const pushes = [...result.path].filter((c) => c === c.toUpperCase()).length;
  return `${result.path.length} moves, ${pushes} pushes, ${result.explored} states\n${result.path}`;
}

function main(): void {
  const args = process.argv.slice(2);
  const byMoves = args.includes('--moves');
  const id = args.find((a) => !a.startsWith('--'));
  for (const def of LEVELS.filter((l) => !id || l.id === id)) {
    const level = parseLevelOrThrow(def.map);
    const result = byMoves ? solveMoves(createGame(level)) : solvePushes(level);
    console.log(`${def.id} [${byMoves ? 'move' : 'push'}-optimal]: ${describe(level, result)}`);
  }
}

// Only run the CLI when executed directly, not when imported.
if ((import.meta as ImportMeta & { main?: boolean }).main) main();
