/**
 * Core engine types.
 *
 * COORDINATE CONVENTION (used everywhere in the engine):
 *   - `x` is the column, increasing to the right.
 *   - `y` is the row, increasing downward.
 *   - (0, 0) is the top-left cell of the map.
 *   - Flat arrays are indexed row-major: index = y * width + x.
 *
 * These are logical grid coordinates only. Pixel coordinates belong to the
 * rendering layer and never appear in the engine.
 */

export interface Position {
  readonly x: number;
  readonly y: number;
}

export type Direction = 'up' | 'down' | 'left' | 'right';

/**
 * Static terrain. It never changes during play.
 * - `void`: outside the playable board (e.g. padding of a short row). Blocks movement.
 * - `wall`: blocks movement.
 * - `floor`: walkable.
 * - `goal`: walkable floor that is a crate target. Goals stay goals forever,
 *   regardless of what stands on them.
 */
export type Terrain = 'void' | 'wall' | 'floor' | 'goal';

/** An immutable, validated level: terrain plus the initial dynamic state. */
export interface Level {
  readonly width: number;
  readonly height: number;
  /** Row-major terrain grid, length = width * height. */
  readonly terrain: readonly Terrain[];
  readonly initialPlayer: Position;
  readonly initialCrates: readonly Position[];
}

/**
 * Dynamic state: everything that changes when the player acts.
 * Crates keep a stable array index for their whole life, so a renderer can
 * map "crate #2" to the same sprite across moves.
 */
export interface GameState {
  readonly player: Position;
  readonly crates: readonly Position[];
  readonly moves: number;
  readonly pushes: number;
}

/** A play session: the level, the current state and the undo history. */
export interface Game {
  readonly level: Level;
  readonly state: GameState;
  /** Previous states, oldest first. Only successful actions add entries. */
  readonly history: readonly GameState[];
}

export type BlockReason = 'wall' | 'crate' | 'solved';

export type MoveResult =
  | {
      readonly kind: 'blocked';
      readonly reason: BlockReason;
      readonly direction: Direction;
      /** The unchanged game (same object reference). */
      readonly game: Game;
    }
  | {
      readonly kind: 'moved';
      readonly direction: Direction;
      readonly game: Game;
      readonly solved: boolean;
    }
  | {
      readonly kind: 'pushed';
      readonly direction: Direction;
      readonly game: Game;
      readonly solved: boolean;
      /** Stable index of the crate that was pushed. */
      readonly crateIndex: number;
    };
