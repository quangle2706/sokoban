import type { GameState } from '../engine/index.ts';
import { TEXT } from './strings.ts';

/** Plain-DOM heads-up display: level title, counters, status, notices. */
export class Hud {
  private readonly moves = byId('moves');
  private readonly pushes = byId('pushes');
  private readonly status = byId('status');
  private readonly notice = byId('notice');
  private readonly announcer = byId('announcer');
  private noticeTimer: number | undefined;

  setLevel(number: number, name: string): void {
    byId('level-number').textContent = TEXT.levelNumber(number);
    byId('level-name').textContent = name;
    byId('board').setAttribute('aria-label', TEXT.boardLabel(number, name));
  }

  update(state: GameState): void {
    this.moves.textContent = String(state.moves);
    this.pushes.textContent = String(state.pushes);
  }

  /** Persistent game status (e.g. "level solved"); null hides it. */
  showStatus(message: string | null): void {
    this.status.hidden = message === null;
    this.status.textContent = message ?? '';
  }

  /** Temporary notice (e.g. save problems), hidden after `ms`. */
  showNotice(message: string, ms = 6000): void {
    window.clearTimeout(this.noticeTimer);
    this.notice.textContent = message;
    this.notice.hidden = false;
    this.noticeTimer = window.setTimeout(() => (this.notice.hidden = true), ms);
  }

  announce(message: string): void {
    // Clear first so repeating the same message is still announced.
    this.announcer.textContent = '';
    window.setTimeout(() => (this.announcer.textContent = message), 30);
  }
}

export function byId<T extends HTMLElement = HTMLElement>(id: string): T {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing #${id} in index.html`);
  return el as T;
}
