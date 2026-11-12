import { parseSave, serializeSave, type LoadOutcome, type SaveData } from './saveData.ts';

/** The subset of the Web Storage API we use (easy to fake in tests). */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export const SAVE_KEY = 'kho-nho/save';
/** An unreadable save is copied here before being replaced, never just lost. */
export const BACKUP_KEY = 'kho-nho/save-unreadable';

/**
 * Reads and writes save data. Never throws: storage can be missing (private
 * mode, blocked cookies) or full, and the game must keep working without it.
 */
export class SaveStore {
  private readonly storage: KeyValueStore | null;

  constructor(storage: KeyValueStore | null) {
    this.storage = storage;
  }

  get available(): boolean {
    return this.storage !== null;
  }

  load(): LoadOutcome {
    let raw: string | null = null;
    try {
      raw = this.storage?.getItem(SAVE_KEY) ?? null;
    } catch {
      raw = null;
    }
    const outcome = parseSave(raw);
    if (outcome.status === 'reset' && raw !== null) {
      try {
        this.storage?.setItem(BACKUP_KEY, raw);
      } catch {
        // Nothing more we can do; the game still starts with fresh data.
      }
    }
    return outcome;
  }

  /** Returns false if the data could not be written. */
  save(data: SaveData): boolean {
    if (!this.storage) return false;
    try {
      this.storage.setItem(SAVE_KEY, serializeSave(data));
      return true;
    } catch {
      return false;
    }
  }
}

/** window.localStorage, or null when the browser refuses access to it. */
export function browserStorage(): KeyValueStore | null {
  try {
    const storage = window.localStorage;
    const probe = '__kho-nho-probe__';
    storage.setItem(probe, probe);
    storage.removeItem(probe);
    return storage;
  } catch {
    return null;
  }
}
