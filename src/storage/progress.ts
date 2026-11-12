/**
 * Pure progress rules: unlocking, best runs and resumable runs.
 * Every function returns a new SaveData and never mutates its input.
 */
import { replaySolution, type Game, type Level } from '../engine/index.ts';
import type { BestRun, SaveData } from './saveData.ts';

export type LevelStatus = 'locked' | 'available' | 'in-progress' | 'completed';

/**
 * Best run = fewest pushes, then fewest moves as the tiebreaker.
 * Both numbers always come from the same single run.
 */
export function isBetterRun(candidate: BestRun, best: BestRun | undefined): boolean {
  if (!best) return true;
  if (candidate.pushes !== best.pushes) return candidate.pushes < best.pushes;
  return candidate.moves < best.moves;
}

/** Unlock rule: the first level is always open; finishing level N opens N+1. */
export function isUnlocked(save: SaveData, levelIds: readonly string[], index: number): boolean {
  const id = levelIds[index];
  if (id === undefined) return false;
  if (index === 0 || id in save.completed) return true;
  const previous = levelIds[index - 1];
  return previous !== undefined && previous in save.completed;
}

export function levelStatus(save: SaveData, levelIds: readonly string[], index: number): LevelStatus {
  const id = levelIds[index];
  if (id === undefined || !isUnlocked(save, levelIds, index)) return 'locked';
  if (id in save.inProgress) return 'in-progress';
  if (id in save.completed) return 'completed';
  return 'available';
}

export interface CompletionRecord {
  readonly save: SaveData;
  readonly best: BestRun;
  readonly isNewBest: boolean;
  /** True when this completion finished a level for the first time. */
  readonly firstClear: boolean;
}

/**
 * Record a solved run. The finished run is no longer resumable, and the
 * "current level" moves on to the next level (if any) so launching the game
 * continues forward.
 */
export function recordCompletion(
  save: SaveData,
  levelId: string,
  run: BestRun,
  nextLevelId: string | null,
): CompletionRecord {
  const previous = save.completed[levelId];
  const isNewBest = isBetterRun(run, previous);
  const best = isNewBest ? { moves: run.moves, pushes: run.pushes } : previous!;
  const { [levelId]: _finished, ...inProgress } = save.inProgress;
  return {
    save: {
      ...save,
      completed: { ...save.completed, [levelId]: best },
      inProgress,
      currentLevelId: nextLevelId ?? levelId,
    },
    best,
    isNewBest,
    firstClear: previous === undefined,
  };
}

/** Remember the unfinished run on `levelId` (empty notation clears it). */
export function recordRun(save: SaveData, levelId: string, notation: string): SaveData {
  const { [levelId]: _old, ...rest } = save.inProgress;
  return {
    ...save,
    inProgress: notation.length > 0 ? { ...rest, [levelId]: notation } : rest,
    currentLevelId: levelId,
  };
}

export function setCurrentLevel(save: SaveData, levelId: string): SaveData {
  return save.currentLevelId === levelId ? save : { ...save, currentLevelId: levelId };
}

/**
 * Rebuild a saved unfinished run by replaying it through the engine.
 * Returns null when the notation no longer fits the level (e.g. the map was
 * edited) or when it ends solved; the caller then starts the level fresh.
 */
export function resumeGame(level: Level, notation: string | undefined): Game | null {
  if (!notation) return null;
  let result;
  try {
    result = replaySolution(level, notation);
  } catch {
    return null;
  }
  return result.ok && !result.solved ? result.game : null;
}

/** Which level to open on launch. */
export function startingLevelIndex(save: SaveData, levelIds: readonly string[]): number {
  const current = save.currentLevelId === null ? -1 : levelIds.indexOf(save.currentLevelId);
  if (current >= 0 && isUnlocked(save, levelIds, current)) return current;
  const firstOpen = levelIds.findIndex((id, i) => isUnlocked(save, levelIds, i) && !(id in save.completed));
  return firstOpen >= 0 ? firstOpen : 0;
}
