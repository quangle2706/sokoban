import { describe, expect, it } from 'vitest';
import {
  createGame,
  isSolved,
  parseLevelOrThrow,
  restart,
  terrainAt,
  tryMove,
  undo,
  type Direction,
  type Game,
  type MoveResult,
} from '../src/engine/index.ts';

/** Apply moves, asserting none is blocked. */
function play(game: Game, ...dirs: Direction[]): Game {
  for (const d of dirs) {
    const r = tryMove(game, d);
    expect(r.kind, `move ${d}`).not.toBe('blocked');
    game = r.game;
  }
  return game;
}

function gameFrom(...rows: string[]): Game {
  return createGame(parseLevelOrThrow(rows));
}

// A corridor with room to walk and push.
//   x: 0123456
const corridor = () =>
  gameFrom(
    '#######',
    '#@ $ .#', // player (1,1), crate (3,1), goal (5,1)
    '#######',
  );

describe('walking', () => {
  it('walks onto floor and counts one move', () => {
    const r = tryMove(corridor(), 'right');
    expect(r.kind).toBe('moved');
    expect(r.game.state.player).toEqual({ x: 2, y: 1 });
    expect(r.game.state.moves).toBe(1);
    expect(r.game.state.pushes).toBe(0);
  });

  it('is blocked by walls', () => {
    const g = corridor();
    for (const d of ['up', 'down', 'left'] as const) {
      const r = tryMove(g, d);
      expect(r.kind).toBe('blocked');
      if (r.kind === 'blocked') expect(r.reason).toBe('wall');
    }
  });

  it('treats out-of-bounds and void cells as blocking', () => {
    // A level whose terrain grid is wider than this row: the cells past the
    // row end are void. We force the player next to the map edge by building
    // the level directly from a valid one.
    const g = corridor();
    const level = g.level;
    expect(terrainAt(level, { x: -1, y: 1 })).toBe('void');
    expect(terrainAt(level, { x: 7, y: 1 })).toBe('void');
    expect(terrainAt(level, { x: 0, y: 99 })).toBe('void');

    // Player standing on the top row edge cell (synthetic state) cannot step out.
    const edgeGame: Game = { ...g, state: { ...g.state, player: { x: 1, y: 0 } } };
    const r = tryMove(edgeGame, 'up');
    expect(r.kind).toBe('blocked');
  });
});

describe('pushing', () => {
  it('pushes a crate onto empty floor: one move and one push', () => {
    const g = play(corridor(), 'right'); // now next to crate
    const r = tryMove(g, 'right');
    expect(r.kind).toBe('pushed');
    expect(r.game.state.player).toEqual({ x: 3, y: 1 });
    expect(r.game.state.crates).toEqual([{ x: 4, y: 1 }]);
    expect(r.game.state.moves).toBe(2);
    expect(r.game.state.pushes).toBe(1);
    if (r.kind === 'pushed') expect(r.crateIndex).toBe(0);
  });

  it('pushes a crate onto a goal and reports solved', () => {
    const g = play(corridor(), 'right', 'right');
    const r = tryMove(g, 'right');
    expect(r.kind).toBe('pushed');
    expect(r.game.state.crates).toEqual([{ x: 5, y: 1 }]);
    expect(r.kind === 'pushed' && r.solved).toBe(true);
    expect(isSolved(r.game.level, r.game.state)).toBe(true);
  });

  it('pushes a crate off a goal', () => {
    // Crate starts on a goal (*) at (2,1); a second crate/goal pair below.
    const open = gameFrom(
      '#######',
      '#@*  .#',
      '#  $  #',
      '#######',
    );
    const r = tryMove(open, 'right');
    expect(r.kind).toBe('pushed');
    expect(r.game.state.crates).toEqual([{ x: 3, y: 1 }, { x: 3, y: 2 }]);
    expect(terrainAt(r.game.level, { x: 2, y: 1 })).toBe('goal');
    expect(r.kind === 'pushed' && r.solved).toBe(false);
  });

  it('blocks pushing a crate into a wall', () => {
    const g = gameFrom(
      '#####',
      '#.@$#',
      '#####',
    );
    const r = tryMove(g, 'right');
    expect(r.kind).toBe('blocked');
    if (r.kind === 'blocked') expect(r.reason).toBe('wall');
  });

  it('blocks pushing two crates at once', () => {
    const g = gameFrom(
      '#######',
      '#@$$..#',
      '#######',
    );
    const r = tryMove(g, 'right');
    expect(r.kind).toBe('blocked');
    if (r.kind === 'blocked') expect(r.reason).toBe('crate');
  });

  it('never pulls: walking away leaves the crate in place', () => {
    const g = play(corridor(), 'right'); // adjacent to crate
    const r = tryMove(g, 'left');
    expect(r.kind).toBe('moved');
    expect(r.game.state.crates).toEqual([{ x: 3, y: 1 }]);
  });
});

describe('goals', () => {
  it('goals survive the player and crates passing over them', () => {
    const g = gameFrom(
      '########',
      '#@ $. .#',
      '#  $   #',
      '########',
    );
    // Push the top crate across the first goal and onwards.
    const after = play(g, 'right', 'right', 'right', 'right'); // crate (3,1) -> (6,1)
    expect(after.state.crates[0]).toEqual({ x: 6, y: 1 });
    expect(terrainAt(after.level, { x: 4, y: 1 })).toBe('goal');
    expect(terrainAt(after.level, { x: 6, y: 1 })).toBe('goal');
    // The player is now standing past the goal it walked over.
    expect(after.state.player).toEqual({ x: 5, y: 1 });
    expect(after.level.terrain.filter((t) => t === 'goal')).toHaveLength(2);
  });

  it('a player starting on a goal (+) leaves the goal behind', () => {
    const g = gameFrom(
      '######',
      '#+ $.#',
      '# $  #',
      '######',
    );
    const r = tryMove(g, 'right');
    expect(terrainAt(r.game.level, { x: 1, y: 1 })).toBe('goal');
  });
});

describe('blocked actions', () => {
  it('do not change counters, history or the game object', () => {
    const g = play(corridor(), 'right');
    const r: MoveResult = tryMove(g, 'up');
    expect(r.kind).toBe('blocked');
    expect(r.game).toBe(g);
    expect(r.game.history).toHaveLength(1);
    expect(r.game.state.moves).toBe(1);
  });
});

describe('immutability', () => {
  it('does not mutate previous states', () => {
    const g0 = corridor();
    const snapshot = JSON.stringify(g0);
    play(g0, 'right', 'right', 'right');
    expect(JSON.stringify(g0)).toBe(snapshot);
  });
});

describe('undo', () => {
  it('restores walks and pushes exactly, including counters', () => {
    const g0 = corridor();
    const g1 = play(g0, 'right'); // walk
    const g2 = play(g1, 'right'); // push

    const u1 = undo(g2);
    expect(u1.undone).toBe(true);
    expect(u1.game.state).toEqual(g1.state);
    expect(u1.game.history).toHaveLength(1);

    const u2 = undo(u1.game);
    expect(u2.game.state).toEqual(g0.state);
    expect(u2.game.state.moves).toBe(0);
    expect(u2.game.state.pushes).toBe(0);
  });

  it('does nothing when history is empty', () => {
    const g = corridor();
    const r = undo(g);
    expect(r.undone).toBe(false);
    expect(r.game).toBe(g);
  });

  it('can undo the winning move and continue playing', () => {
    const won = play(corridor(), 'right', 'right', 'right');
    expect(isSolved(won.level, won.state)).toBe(true);

    const r = undo(won);
    expect(isSolved(r.game.level, r.game.state)).toBe(false);
    expect(r.game.state.pushes).toBe(1);
    expect(tryMove(r.game, 'right').kind).toBe('pushed');
  });
});

describe('restart', () => {
  it('restores the initial state with zero counters and empty history', () => {
    const g0 = corridor();
    const played = play(g0, 'right', 'right', 'left');
    const r = restart(played);
    expect(r.state).toEqual(g0.state);
    expect(r.state.moves).toBe(0);
    expect(r.state.pushes).toBe(0);
    expect(r.history).toHaveLength(0);
  });
});

describe('winning', () => {
  it('requires every crate on a goal', () => {
    const g = gameFrom(
      '########',
      '#@$ .  #',
      '# $ .  #',
      '########',
    );
    expect(isSolved(g.level, g.state)).toBe(false);
    const oneDone = play(g, 'right', 'right'); // top crate on goal
    expect(isSolved(oneDone.level, oneDone.state)).toBe(false);
  });

  it('accepts no further moves once solved (undo/restart still work)', () => {
    const won = play(corridor(), 'right', 'right', 'right');
    const r = tryMove(won, 'left');
    expect(r.kind).toBe('blocked');
    if (r.kind === 'blocked') expect(r.reason).toBe('solved');
    expect(undo(won).undone).toBe(true);
    expect(restart(won).state.moves).toBe(0);
  });
});
