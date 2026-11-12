import type { GameState } from '../engine/index.ts';
import type { BestRun } from '../storage/saveData.ts';
import { byId } from './hud.ts';
import { TEXT } from './strings.ts';

export interface CompletionHandlers {
  onNext(): void;
  onReplay(): void;
  onLevels(): void;
  /** Dialog closed by any means (button, Esc, or before another action). */
  onClose(): void;
}

export interface CompletionInfo {
  readonly state: GameState;
  readonly best: BestRun;
  readonly isNewBest: boolean;
  /** 1-based number of the next level, or null if this was the last one. */
  readonly nextNumber: number | null;
  /** True when finishing this level unlocked the next one just now. */
  readonly unlockedNext: boolean;
  readonly allComplete: boolean;
}

/**
 * Completion overlay built on the native <dialog> element: focus trapping,
 * Esc to close and focus restoration come for free.
 */
export class CompletionDialog {
  private readonly dialog = byId<HTMLDialogElement>('completion');
  private readonly nextButton: HTMLButtonElement;

  constructor(handlers: CompletionHandlers) {
    const button = (name: string) => {
      const el = this.dialog.querySelector<HTMLButtonElement>(`[data-dialog="${name}"]`);
      if (!el) throw new Error(`Missing completion button ${name}`);
      return el;
    };
    this.nextButton = button('next');
    const closeThen = (action: () => void) => () => {
      this.dialog.close();
      action();
    };
    this.nextButton.addEventListener('click', closeThen(() => handlers.onNext()));
    button('replay').addEventListener('click', closeThen(() => handlers.onReplay()));
    button('levels').addEventListener('click', closeThen(() => handlers.onLevels()));
    button('close').addEventListener('click', () => this.dialog.close());
    this.dialog.addEventListener('close', () => handlers.onClose());
  }

  get isOpen(): boolean {
    return this.dialog.open;
  }

  show(info: CompletionInfo): void {
    byId('completion-moves').textContent = String(info.state.moves);
    byId('completion-pushes').textContent = String(info.state.pushes);
    byId('completion-message').textContent = info.allComplete ? TEXT.completeAllMessage : TEXT.completeMessage;

    const best = byId('completion-best');
    best.textContent = info.isNewBest ? TEXT.newBest : TEXT.bestRun(info.best.moves, info.best.pushes);
    best.classList.toggle('is-new', info.isNewBest);

    const unlocked = byId('completion-unlocked');
    unlocked.hidden = !(info.unlockedNext && info.nextNumber !== null);
    if (info.nextNumber !== null) unlocked.textContent = TEXT.unlockedNext(info.nextNumber);

    // No "next" when there is no next level: hidden, never a dead button.
    this.nextButton.hidden = info.nextNumber === null;

    if (this.dialog.open) return;
    this.dialog.showModal();
    // showModal focuses the first focusable element; make it the primary action.
    (info.nextNumber !== null ? this.nextButton : byId('completion-replay')).focus();
  }
}
