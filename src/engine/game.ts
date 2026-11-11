import { crateIndexAt, isWalkableTerrain, step, terrainAt } from './geometry.ts';
import type { Direction, Game, GameState, Level, MoveResult } from './types.ts';

/**
 * Pure, deterministic game operations.
 * Every function returns new objects and never mutates its inputs, so any
 * previous `Game` or `GameState` value stays valid (that is what makes undo
 * trivial and safe).
 */

export function createGame(level: Level): Game {
  return { level, state: initialState(level), history: [] };
}

export function initialState(level: Level): GameState {
  return { player: level.initialPlayer, crates: level.initialCrates, moves: 0, pushes: 0 };
}

export function isSolved(level: Level, state: GameState): boolean {
  return state.crates.every((c) => terrainAt(level, c) === 'goal');
}

/**
 * Attempt to move the player one cell.
 * - Walking onto free floor: moves + 1.
 * - Pushing one crate onto free floor/goal: moves + 1 and pushes + 1.
 * - Anything else is `blocked` and returns the same game object unchanged
 *   (no counters, no history entry).
 * - A solved level accepts no further moves; the player may still undo or
 *   restart.
 */
export function tryMove(game: Game, direction: Direction): MoveResult {
  const { level, state } = game;

  if (isSolved(level, state)) {
    return { kind: 'blocked', reason: 'solved', direction, game };
  }

  const target = step(state.player, direction);
  if (!isWalkableTerrain(terrainAt(level, target))) {
    return { kind: 'blocked', reason: 'wall', direction, game };
  }

  const crateIndex = crateIndexAt(state.crates, target);

  if (crateIndex === -1) {
    const next: GameState = { ...state, player: target, moves: state.moves + 1 };
    return { kind: 'moved', direction, game: advance(game, next), solved: false };
  }

  const beyond = step(target, direction);
  if (!isWalkableTerrain(terrainAt(level, beyond))) {
    return { kind: 'blocked', reason: 'wall', direction, game };
  }
  if (crateIndexAt(state.crates, beyond) !== -1) {
    return { kind: 'blocked', reason: 'crate', direction, game };
  }

  const crates = state.crates.map((c, i) => (i === crateIndex ? beyond : c));
  const next: GameState = {
    player: target,
    crates,
    moves: state.moves + 1,
    pushes: state.pushes + 1,
  };
  return {
    kind: 'pushed',
    direction,
    game: advance(game, next),
    solved: isSolved(level, next),
    crateIndex,
  };
}

export interface UndoResult {
  readonly game: Game;
  /** False when there was nothing to undo (the game is returned unchanged). */
  readonly undone: boolean;
}

/** Restore the previous state exactly, including both counters. */
export function undo(game: Game): UndoResult {
  const previous = game.history[game.history.length - 1];
  if (!previous) return { game, undone: false };
  return {
    game: { level: game.level, state: previous, history: game.history.slice(0, -1) },
    undone: true,
  };
}

/** Back to the initial layout with zero counters and an empty history. */
export function restart(game: Game): Game {
  return createGame(game.level);
}

function advance(game: Game, next: GameState): Game {
  return { level: game.level, state: next, history: [...game.history, game.state] };
}
