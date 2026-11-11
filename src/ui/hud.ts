import type { GameState } from '../engine/index.ts';
import { TEXT } from './strings.ts';

/** Plain-DOM heads-up display: level title, counters, status, announcements. */
export class Hud {
  private readonly moves = byId('moves');
  private readonly pushes = byId('pushes');
  private readonly status = byId('status');
  private readonly announcer = byId('announcer');

  setLevel(number: number, name: string): void {
    byId('level-number').textContent = TEXT.levelNumber(number);
    byId('level-name').textContent = name;
    byId('board').setAttribute('aria-label', TEXT.boardLabel(name));
  }

  update(state: GameState): void {
    this.moves.textContent = String(state.moves);
    this.pushes.textContent = String(state.pushes);
  }

  showStatus(message: string | null): void {
    this.status.hidden = message === null;
    this.status.textContent = message ?? '';
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
