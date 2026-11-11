import type { GameState } from '../engine/index.ts';
import { byId } from './hud.ts';

export interface CompletionHandlers {
  /** Dialog just opened (gameplay input should pause). */
  onOpen(): void;
  /** Player chose to replay the level from the start. */
  onReplay(): void;
  /** Dialog closed by any means (button, Esc, or after replay). */
  onClose(): void;
}

/**
 * Completion overlay built on the native <dialog> element: it provides focus
 * trapping, Esc to close and restores focus on close for free.
 */
export class CompletionDialog {
  private readonly dialog = byId<HTMLDialogElement>('completion');
  private readonly handlers: CompletionHandlers;

  constructor(handlers: CompletionHandlers) {
    this.handlers = handlers;
    this.dialog.querySelector('[data-dialog="close"]')?.addEventListener('click', () => this.dialog.close());
    this.dialog.querySelector('[data-dialog="replay"]')?.addEventListener('click', () => {
      this.dialog.close();
      handlers.onReplay();
    });
    this.dialog.addEventListener('close', () => handlers.onClose());
  }

  get isOpen(): boolean {
    return this.dialog.open;
  }

  show(state: GameState): void {
    byId('completion-moves').textContent = String(state.moves);
    byId('completion-pushes').textContent = String(state.pushes);
    if (this.dialog.open) return;
    this.dialog.showModal();
    this.handlers.onOpen();
  }
}
