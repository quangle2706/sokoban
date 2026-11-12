/**
 * Versioned save-data format and its validator. Pure: no browser APIs.
 *
 * What is saved (and nothing else; never animation or UI state):
 *   - completed:      levelId -> best single run { moves, pushes }
 *   - inProgress:     levelId -> LURD notation of the unfinished run, replayed
 *                     through the engine on load (which re-validates it)
 *   - currentLevelId: the level to reopen on launch
 *   - settings:       sound and motion preferences (optional in stored data;
 *                     saves written before Milestone 3 get the defaults)
 *
 * Saves live in this browser only; nothing is synced across devices.
 */

export const SAVE_VERSION = 1;
/** Upper bound for a stored run; longer strings are treated as corrupt. */
export const MAX_NOTATION_LENGTH = 50_000;
const NOTATION = /^[udlrUDLR]*$/;
const LEVEL_ID = /^[a-z0-9-]{1,64}$/;

export interface BestRun {
  readonly moves: number;
  readonly pushes: number;
}

/** 'system' follows the OS prefers-reduced-motion setting. */
export type MotionPreference = 'system' | 'reduce' | 'full';

export interface Settings {
  readonly sound: boolean;
  readonly motion: MotionPreference;
}

export const DEFAULT_SETTINGS: Settings = Object.freeze({ sound: true, motion: 'system' });

export interface SaveData {
  readonly version: typeof SAVE_VERSION;
  readonly completed: Readonly<Record<string, BestRun>>;
  readonly inProgress: Readonly<Record<string, string>>;
  readonly currentLevelId: string | null;
  readonly settings: Settings;
}

/**
 * - fresh:    nothing was saved before
 * - loaded:   save read without problems
 * - repaired: save readable, but some invalid entries were dropped
 * - reset:    save unreadable or from an unknown version; starting over
 */
export type LoadStatus = 'fresh' | 'loaded' | 'repaired' | 'reset';

export interface LoadOutcome {
  readonly data: SaveData;
  readonly status: LoadStatus;
}

export function emptySave(): SaveData {
  return { version: SAVE_VERSION, completed: {}, inProgress: {}, currentLevelId: null, settings: DEFAULT_SETTINGS };
}

export function serializeSave(data: SaveData): string {
  return JSON.stringify(data);
}

/** Parse and validate raw stored text. Never throws. */
export function parseSave(raw: string | null): LoadOutcome {
  if (raw === null) return { data: emptySave(), status: 'fresh' };

  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return { data: emptySave(), status: 'reset' };
  }
  if (!isRecord(value) || value.version !== SAVE_VERSION) {
    // Future migrations go here: `if (value.version === 1) value = migrateV1(value)`.
    return { data: emptySave(), status: 'reset' };
  }

  let dropped = false;

  const completed: Record<string, BestRun> = {};
  if (isRecord(value.completed)) {
    for (const [id, run] of Object.entries(value.completed)) {
      if (LEVEL_ID.test(id) && isBestRun(run)) completed[id] = { moves: run.moves, pushes: run.pushes };
      else dropped = true;
    }
  } else if (value.completed !== undefined) dropped = true;

  const inProgress: Record<string, string> = {};
  if (isRecord(value.inProgress)) {
    for (const [id, notation] of Object.entries(value.inProgress)) {
      if (LEVEL_ID.test(id) && isNotation(notation) && notation.length > 0) inProgress[id] = notation;
      else dropped = true;
    }
  } else if (value.inProgress !== undefined) dropped = true;

  let currentLevelId: string | null = null;
  if (typeof value.currentLevelId === 'string' && LEVEL_ID.test(value.currentLevelId)) {
    currentLevelId = value.currentLevelId;
  } else if (value.currentLevelId !== null && value.currentLevelId !== undefined) dropped = true;

  // Settings were added after version 1 shipped: missing means defaults (not
  // an error); each invalid field falls back to its default on its own.
  let settings: Settings = DEFAULT_SETTINGS;
  if (isRecord(value.settings)) {
    const { sound, motion } = value.settings;
    const validSound = typeof sound === 'boolean';
    const validMotion = motion === 'system' || motion === 'reduce' || motion === 'full';
    if (!validSound || !validMotion) dropped = true;
    settings = {
      sound: validSound ? sound : DEFAULT_SETTINGS.sound,
      motion: validMotion ? motion : DEFAULT_SETTINGS.motion,
    };
  } else if (value.settings !== undefined) dropped = true;

  return {
    data: { version: SAVE_VERSION, completed, inProgress, currentLevelId, settings },
    status: dropped ? 'repaired' : 'loaded',
  };
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isBestRun(v: unknown): v is BestRun {
  return (
    isRecord(v) &&
    Number.isSafeInteger(v.moves) &&
    Number.isSafeInteger(v.pushes) &&
    (v.pushes as number) >= 0 &&
    (v.moves as number) >= (v.pushes as number) &&
    (v.moves as number) > 0
  );
}

function isNotation(v: unknown): v is string {
  return typeof v === 'string' && v.length <= MAX_NOTATION_LENGTH && NOTATION.test(v);
}
