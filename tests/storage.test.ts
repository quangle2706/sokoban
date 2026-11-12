import { describe, expect, it } from 'vitest';
import { createGame, parseLevelOrThrow, tryMove, undo, type Direction, type Game } from '../src/engine/index.ts';
import {
  isBetterRun,
  isUnlocked,
  levelStatus,
  recordCompletion,
  recordRun,
  resetProgress,
  resumeGame,
  startingLevelIndex,
  updateSettings,
} from '../src/storage/progress.ts';
import { DEFAULT_SETTINGS, emptySave, parseSave, serializeSave, type SaveData } from '../src/storage/saveData.ts';
import { BACKUP_KEY, SAVE_KEY, SaveStore, type KeyValueStore } from '../src/storage/saveStore.ts';

const IDS = ['one', 'two', 'three'];

function save(partial: Partial<SaveData> = {}): SaveData {
  return { ...emptySave(), ...partial };
}

class MemoryStore implements KeyValueStore {
  readonly data = new Map<string, string>();
  failWrites = false;
  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    if (this.failWrites) throw new Error('QuotaExceededError');
    this.data.set(key, value);
  }
}

describe('best run', () => {
  it('prefers fewer pushes, then fewer moves', () => {
    expect(isBetterRun({ moves: 50, pushes: 9 }, { moves: 20, pushes: 10 })).toBe(true);
    expect(isBetterRun({ moves: 20, pushes: 11 }, { moves: 50, pushes: 10 })).toBe(false);
    expect(isBetterRun({ moves: 30, pushes: 10 }, { moves: 40, pushes: 10 })).toBe(true);
    expect(isBetterRun({ moves: 40, pushes: 10 }, { moves: 40, pushes: 10 })).toBe(false);
    expect(isBetterRun({ moves: 40, pushes: 10 }, undefined)).toBe(true);
  });

  it('keeps one coherent run instead of mixing stats from different runs', () => {
    let s = save();
    s = recordCompletion(s, 'one', { moves: 30, pushes: 10 }, 'two').save;
    // Fewer moves but more pushes: not better, so nothing changes.
    const r = recordCompletion(s, 'one', { moves: 20, pushes: 12 }, 'two');
    expect(r.isNewBest).toBe(false);
    expect(r.best).toEqual({ moves: 30, pushes: 10 });
    expect(r.save.completed.one).toEqual({ moves: 30, pushes: 10 });
  });

  it('reports first clears and new bests', () => {
    const first = recordCompletion(save(), 'one', { moves: 30, pushes: 10 }, 'two');
    expect(first.firstClear).toBe(true);
    expect(first.isNewBest).toBe(true);
    const better = recordCompletion(first.save, 'one', { moves: 28, pushes: 9 }, 'two');
    expect(better.firstClear).toBe(false);
    expect(better.isNewBest).toBe(true);
  });
});

describe('unlocking and status', () => {
  it('opens the first level and each level after a completed one', () => {
    const s = save({ completed: { one: { moves: 5, pushes: 2 } } });
    expect(isUnlocked(s, IDS, 0)).toBe(true);
    expect(isUnlocked(s, IDS, 1)).toBe(true);
    expect(isUnlocked(s, IDS, 2)).toBe(false);
    expect(isUnlocked(s, IDS, 3)).toBe(false);
    expect(isUnlocked(save(), IDS, 1)).toBe(false);
  });

  it('keeps a completed level open even if an earlier one is not', () => {
    const s = save({ completed: { three: { moves: 5, pushes: 2 } } });
    expect(isUnlocked(s, IDS, 2)).toBe(true);
  });

  it('derives card status', () => {
    const s = save({ completed: { one: { moves: 5, pushes: 2 } }, inProgress: { two: 'uu' } });
    expect(levelStatus(s, IDS, 0)).toBe('completed');
    expect(levelStatus(s, IDS, 1)).toBe('in-progress');
    expect(levelStatus(s, IDS, 2)).toBe('locked');
    expect(levelStatus(save(), IDS, 0)).toBe('available');
  });
});

describe('runs and resume', () => {
  it('records and clears in-progress runs and the current level', () => {
    let s = recordRun(save(), 'one', 'uR');
    expect(s.inProgress).toEqual({ one: 'uR' });
    expect(s.currentLevelId).toBe('one');
    s = recordRun(s, 'one', '');
    expect(s.inProgress).toEqual({});
  });

  it('completion clears the run and advances the current level', () => {
    const s = recordCompletion(save({ inProgress: { one: 'uR', two: 'l' } }), 'one', { moves: 2, pushes: 1 }, 'two');
    expect(s.save.inProgress).toEqual({ two: 'l' });
    expect(s.save.currentLevelId).toBe('two');
    const last = recordCompletion(save(), 'three', { moves: 2, pushes: 1 }, null);
    expect(last.save.currentLevelId).toBe('three');
  });

  it('does not mutate the input save', () => {
    const s = save({ inProgress: { one: 'u' } });
    const snapshot = JSON.stringify(s);
    recordRun(s, 'two', 'l');
    recordCompletion(s, 'one', { moves: 1, pushes: 1 }, 'two');
    expect(JSON.stringify(s)).toBe(snapshot);
  });

  const level = parseLevelOrThrow(['#######', '#@ $ .#', '#######']);

  it('resumes a run with its full undo history', () => {
    const game = resumeGame(level, 'rR');
    expect(game?.state.player).toEqual({ x: 3, y: 1 });
    expect(game?.state.moves).toBe(2);
    expect(game?.state.pushes).toBe(1);
    expect(game?.history).toHaveLength(2);
    expect(undo(game!).game.state.pushes).toBe(0);
  });

  it('rejects runs that no longer fit the level or are already solved', () => {
    expect(resumeGame(level, 'uuu')).toBeNull(); // blocked
    expect(resumeGame(level, 'rr')).toBeNull(); // 2nd step is a push, notation says walk
    expect(resumeGame(level, 'rRR')).toBeNull(); // solved
    expect(resumeGame(level, 'x')).toBeNull(); // invalid letter
    expect(resumeGame(level, undefined)).toBeNull();
  });

  it('chooses the starting level', () => {
    expect(startingLevelIndex(save(), IDS)).toBe(0);
    const s = save({ completed: { one: { moves: 1, pushes: 1 } } });
    expect(startingLevelIndex(s, IDS)).toBe(1); // first open, unfinished level
    expect(startingLevelIndex({ ...s, currentLevelId: 'one' }, IDS)).toBe(0);
    expect(startingLevelIndex({ ...s, currentLevelId: 'three' }, IDS)).toBe(1); // locked -> ignored
    expect(startingLevelIndex({ ...s, currentLevelId: 'gone' }, IDS)).toBe(1); // unknown id
  });
});

describe('save data validation', () => {
  it('starts fresh when nothing is saved', () => {
    expect(parseSave(null)).toEqual({ data: emptySave(), status: 'fresh' });
  });

  it('round-trips valid data', () => {
    const data = save({ completed: { one: { moves: 9, pushes: 3 } }, inProgress: { two: 'uRd' }, currentLevelId: 'two' });
    expect(parseSave(serializeSave(data))).toEqual({ data, status: 'loaded' });
  });

  it('resets on corrupt JSON or an unknown version', () => {
    expect(parseSave('{not json').status).toBe('reset');
    expect(parseSave('[]').status).toBe('reset');
    expect(parseSave('null').status).toBe('reset');
    expect(parseSave(JSON.stringify({ version: 2, completed: {} })).status).toBe('reset');
    expect(parseSave(JSON.stringify({ completed: {} })).status).toBe('reset');
  });

  it('drops individual invalid entries and keeps the rest', () => {
    const raw = JSON.stringify({
      version: 1,
      completed: {
        one: { moves: 9, pushes: 3 },
        two: { moves: 2, pushes: 5 }, // more pushes than moves: impossible
        three: { moves: '9', pushes: 3 },
        'BAD ID': { moves: 9, pushes: 3 },
      },
      inProgress: { one: 'uRd', two: 'up up', three: '' },
      currentLevelId: 42,
      extra: 'ignored',
    });
    const r = parseSave(raw);
    expect(r.status).toBe('repaired');
    expect(r.data).toEqual(save({ completed: { one: { moves: 9, pushes: 3 } }, inProgress: { one: 'uRd' } }));
  });
});

describe('settings', () => {
  it('defaults when a version-1 save has no settings (pre-Milestone-3 saves)', () => {
    const raw = JSON.stringify({ version: 1, completed: { one: { moves: 9, pushes: 3 } }, inProgress: {}, currentLevelId: 'one' });
    const r = parseSave(raw);
    expect(r.status).toBe('loaded');
    expect(r.data.settings).toEqual(DEFAULT_SETTINGS);
    expect(r.data.completed.one).toEqual({ moves: 9, pushes: 3 });
  });

  it('round-trips settings and repairs invalid fields individually', () => {
    const data = save({ settings: { sound: false, motion: 'reduce' } });
    expect(parseSave(serializeSave(data))).toEqual({ data, status: 'loaded' });

    const bad = parseSave(JSON.stringify({ version: 1, settings: { sound: 'yes', motion: 'full' } }));
    expect(bad.status).toBe('repaired');
    expect(bad.data.settings).toEqual({ sound: true, motion: 'full' });
    expect(parseSave(JSON.stringify({ version: 1, settings: 5 })).data.settings).toEqual(DEFAULT_SETTINGS);
  });

  it('updates settings without touching progress', () => {
    const s = save({ completed: { one: { moves: 5, pushes: 2 } } });
    const next = updateSettings(s, { sound: false });
    expect(next.settings).toEqual({ sound: false, motion: 'system' });
    expect(next.completed).toBe(s.completed);
  });

  it('reset progress clears everything except settings', () => {
    const s = save({
      completed: { one: { moves: 5, pushes: 2 } },
      inProgress: { two: 'uu' },
      currentLevelId: 'two',
      settings: { sound: false, motion: 'reduce' },
    });
    expect(resetProgress(s)).toEqual(save({ settings: { sound: false, motion: 'reduce' } }));
  });
});

describe('SaveStore', () => {
  it('saves and loads through a storage backend', () => {
    const storage = new MemoryStore();
    const store = new SaveStore(storage);
    const data = save({ currentLevelId: 'two' });
    expect(store.save(data)).toBe(true);
    expect(store.load()).toEqual({ data, status: 'loaded' });
  });

  it('backs up an unreadable save before starting over', () => {
    const storage = new MemoryStore();
    storage.data.set(SAVE_KEY, '{broken');
    const outcome = new SaveStore(storage).load();
    expect(outcome.status).toBe('reset');
    expect(storage.data.get(BACKUP_KEY)).toBe('{broken');
  });

  it('never throws when storage is missing or full', () => {
    const none = new SaveStore(null);
    expect(none.load().status).toBe('fresh');
    expect(none.save(emptySave())).toBe(false);

    const full = new MemoryStore();
    full.failWrites = true;
    expect(new SaveStore(full).save(emptySave())).toBe(false);
  });
});

describe('notation of a game (engine)', () => {
  it('reproduces the moves from history, including after undo', async () => {
    const { notationOf, replaySolution } = await import('../src/engine/index.ts');
    const lvl = parseLevelOrThrow(['########', '#@ $ . #', '#  $ . #', '########']);
    let game: Game = createGame(lvl);
    for (const d of ['right', 'right', 'down', 'left', 'right'] as Direction[]) {
      const r = tryMove(game, d);
      if (r.kind !== 'blocked') game = r.game;
    }
    game = undo(game).game;
    const notation = notationOf(game);
    expect(notation).toBe('rRl'); // the 'down' was blocked (crate into wall), so it left no trace
    const replay = replaySolution(lvl, notation);
    expect(replay.ok && replay.game.state).toEqual(game.state);
    expect(replay.ok && replay.game.history).toEqual(game.history);
    expect(notationOf(createGame(lvl))).toBe('');
  });
});
