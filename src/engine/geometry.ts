import type { Direction, Level, Position, Terrain } from './types.ts';

export const DIRECTIONS: readonly Direction[] = ['up', 'down', 'left', 'right'];

const DELTAS: Readonly<Record<Direction, Position>> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

export function step(p: Position, direction: Direction): Position {
  const d = DELTAS[direction];
  return { x: p.x + d.x, y: p.y + d.y };
}

export function samePosition(a: Position, b: Position): boolean {
  return a.x === b.x && a.y === b.y;
}

export function isInBounds(width: number, height: number, p: Position): boolean {
  return p.x >= 0 && p.y >= 0 && p.x < width && p.y < height;
}

/** Terrain at a position; anything outside the map is treated as `void`. */
export function terrainAt(level: Level, p: Position): Terrain {
  if (!isInBounds(level.width, level.height, p)) return 'void';
  return level.terrain[p.y * level.width + p.x] ?? 'void';
}

export function isWalkableTerrain(t: Terrain): boolean {
  return t === 'floor' || t === 'goal';
}

/** Index of the crate at `p`, or -1. Boards are small, so a linear scan is fine. */
export function crateIndexAt(crates: readonly Position[], p: Position): number {
  return crates.findIndex((c) => samePosition(c, p));
}
