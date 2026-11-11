import { DIRECTIONS, isInBounds, isWalkableTerrain, step } from './geometry.ts';
import type { Level, Position, Terrain } from './types.ts';

/**
 * LEVEL TEXT FORMAT (one character per cell, one line per row):
 *
 *   #  wall
 *   ␠  floor (a space)
 *   .  goal
 *   @  player on floor
 *   +  player on goal
 *   $  crate on floor
 *   *  crate on goal
 *
 * Ragged rows: rows may be shorter than the widest row. Missing trailing
 * cells are normalized to `void` (outside the board), never to floor.
 *
 * Structural validation does NOT prove a level is solvable. Solvability is
 * checked separately by replaying an author solution in the test suite.
 */

export const MAX_LEVEL_SIZE = 64;

export interface LevelIssue {
  readonly code:
    | 'empty'
    | 'too-large'
    | 'unsupported-symbol'
    | 'player-count'
    | 'no-crates'
    | 'crate-goal-mismatch'
    | 'not-enclosed'
    | 'entity-outside-board';
  /** Technical (English) description for authors and tests. */
  readonly message: string;
  readonly position?: Position;
}

export type ParseResult =
  | { readonly ok: true; readonly level: Level }
  | { readonly ok: false; readonly issues: readonly LevelIssue[] };

/** Accepts either one string with newline-separated rows or an array of rows. */
export function parseLevel(source: string | readonly string[]): ParseResult {
  const rows = typeof source === 'string' ? source.split(/\r?\n/) : [...source];

  // Drop fully blank leading/trailing lines (convenient for template strings),
  // but keep every space inside the map.
  while (rows.length > 0 && rows[0]!.trim() === '') rows.shift();
  while (rows.length > 0 && rows[rows.length - 1]!.trim() === '') rows.pop();

  if (rows.length === 0) {
    return fail([{ code: 'empty', message: 'Level has no rows.' }]);
  }

  const height = rows.length;
  const width = Math.max(...rows.map((r) => r.length));
  if (width > MAX_LEVEL_SIZE || height > MAX_LEVEL_SIZE) {
    return fail([
      {
        code: 'too-large',
        message: `Level is ${width}x${height}; maximum is ${MAX_LEVEL_SIZE}x${MAX_LEVEL_SIZE}.`,
      },
    ]);
  }

  const issues: LevelIssue[] = [];
  const terrain: Terrain[] = new Array<Terrain>(width * height).fill('void');
  const players: Position[] = [];
  const crates: Position[] = [];
  let goalCount = 0;

  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x++) {
      const ch = row[x]!;
      const position = { x, y };
      const index = y * width + x;
      switch (ch) {
        case '#':
          terrain[index] = 'wall';
          break;
        case ' ':
          terrain[index] = 'floor';
          break;
        case '.':
          terrain[index] = 'goal';
          break;
        case '@':
          terrain[index] = 'floor';
          players.push(position);
          break;
        case '+':
          terrain[index] = 'goal';
          players.push(position);
          break;
        case '$':
          terrain[index] = 'floor';
          crates.push(position);
          break;
        case '*':
          terrain[index] = 'goal';
          crates.push(position);
          break;
        default:
          issues.push({
            code: 'unsupported-symbol',
            message: `Unsupported symbol ${JSON.stringify(ch)} at x=${x}, y=${y}.`,
            position,
          });
      }
      if (terrain[index] === 'goal') goalCount++;
    }
  });

  if (players.length !== 1) {
    issues.push({
      code: 'player-count',
      message: `Expected exactly one player, found ${players.length}.`,
    });
  }
  if (crates.length === 0) {
    issues.push({ code: 'no-crates', message: 'Level must contain at least one crate.' });
  }
  if (crates.length !== goalCount) {
    issues.push({
      code: 'crate-goal-mismatch',
      message: `Crate count (${crates.length}) must equal goal count (${goalCount}).`,
    });
  }

  // Enclosure check: flood-fill from the player through walkable cells
  // (ignoring crates). The player must never be able to reach the map edge or
  // a void cell, and every crate and goal must lie inside that region.
  const player = players[0];
  if (players.length === 1 && player && issues.length === 0) {
    const region = floodWalkable(width, height, terrain, player);
    if (region.leaks) {
      issues.push({
        code: 'not-enclosed',
        message: 'The area reachable by the player is not enclosed by walls.',
      });
    } else {
      for (const crate of crates) {
        if (!region.cells.has(crate.y * width + crate.x)) {
          issues.push({
            code: 'entity-outside-board',
            message: `Crate at x=${crate.x}, y=${crate.y} is outside the playable area.`,
            position: crate,
          });
        }
      }
      terrain.forEach((t, i) => {
        if (t === 'goal' && !region.cells.has(i)) {
          const position = { x: i % width, y: Math.floor(i / width) };
          issues.push({
            code: 'entity-outside-board',
            message: `Goal at x=${position.x}, y=${position.y} is outside the playable area.`,
            position,
          });
        }
      });
    }
  }

  if (issues.length > 0 || !player) return fail(issues);

  return {
    ok: true,
    level: Object.freeze({
      width,
      height,
      terrain: Object.freeze(terrain),
      initialPlayer: Object.freeze({ ...player }),
      initialCrates: Object.freeze(crates.map((c) => Object.freeze({ ...c }))),
    }),
  };
}

/** Like parseLevel but throws with all issues listed. Use for bundled levels. */
export function parseLevelOrThrow(source: string | readonly string[]): Level {
  const result = parseLevel(source);
  if (!result.ok) {
    throw new Error(`Invalid level:\n${result.issues.map((i) => `- ${i.message}`).join('\n')}`);
  }
  return result.level;
}

/**
 * Cells reachable by walking from `start` through walkable terrain, ignoring
 * crates. Exposed so the renderer can draw floor only inside the walls.
 */
export function playableArea(level: Level): ReadonlySet<number> {
  return floodWalkable(level.width, level.height, level.terrain, level.initialPlayer).cells;
}

function floodWalkable(
  width: number,
  height: number,
  terrain: readonly Terrain[],
  start: Position,
): { cells: Set<number>; leaks: boolean } {
  const cells = new Set<number>();
  let leaks = false;
  const stack: Position[] = [start];
  while (stack.length > 0) {
    const p = stack.pop()!;
    const index = p.y * width + p.x;
    if (cells.has(index)) continue;
    cells.add(index);
    for (const d of DIRECTIONS) {
      const n = step(p, d);
      if (!isInBounds(width, height, n)) {
        leaks = true; // walkable cell touches the map edge
        continue;
      }
      const t = terrain[n.y * width + n.x]!;
      if (t === 'void') leaks = true; // walkable cell touches outside space
      else if (isWalkableTerrain(t)) stack.push(n);
    }
  }
  return { cells, leaks };
}

function fail(issues: LevelIssue[]): ParseResult {
  return { ok: false, issues };
}
