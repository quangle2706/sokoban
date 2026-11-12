import type { LevelStatus } from '../storage/progress.ts';
import type { BestRun } from '../storage/saveData.ts';
import { byId } from './hud.ts';
import { TEXT } from './strings.ts';

export interface LevelCard {
  readonly index: number;
  readonly name: string;
  readonly status: LevelStatus;
  readonly best: BestRun | undefined;
  /** Moves made in the saved unfinished run (status 'in-progress'). */
  readonly progressMoves: number;
  readonly isCurrent: boolean;
}

export interface LevelSelectHandlers {
  onPick(index: number): void;
  onClose(): void;
}

const ICON_CHECK =
  '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const ICON_LOCK =
  '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><rect x="5" y="10.5" width="14" height="10" rx="2.5" fill="currentColor"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" fill="none" stroke="currentColor" stroke-width="2.4"/></svg>';

/**
 * Full-screen level picker on a modal <dialog> (focus trap, Esc = back).
 * Locked levels are rendered as non-interactive list items, not disabled
 * buttons, so there is never a button that does nothing.
 */
export class LevelSelect {
  private readonly dialog = byId<HTMLDialogElement>('level-select');
  private readonly grid = byId<HTMLOListElement>('level-grid');
  private readonly handlers: LevelSelectHandlers;

  constructor(handlers: LevelSelectHandlers) {
    this.handlers = handlers;
    this.dialog.querySelector('[data-action="back"]')?.addEventListener('click', () => this.dialog.close());
    this.dialog.addEventListener('close', () => handlers.onClose());
    this.grid.addEventListener('click', (event) => {
      const card = (event.target as Element).closest<HTMLButtonElement>('button[data-index]');
      if (!card) return;
      const index = Number(card.dataset.index);
      this.dialog.close();
      this.handlers.onPick(index);
    });
  }

  get isOpen(): boolean {
    return this.dialog.open;
  }

  open(cards: readonly LevelCard[]): void {
    const done = cards.filter((c) => c.best !== undefined).length;
    byId('level-summary').textContent = TEXT.progressSummary(done, cards.length);
    this.grid.replaceChildren(...cards.map(renderCard));
    if (!this.dialog.open) this.dialog.showModal();
    const current = this.grid.querySelector<HTMLButtonElement>('button.is-current') ?? this.grid.querySelector('button');
    current?.focus();
    current?.scrollIntoView({ block: 'nearest' });
  }

  close(): void {
    if (this.dialog.open) this.dialog.close();
  }
}

function renderCard(card: LevelCard): HTMLLIElement {
  const li = document.createElement('li');
  const number = card.index + 1;

  if (card.status === 'locked') {
    li.className = 'level-card is-locked';
    li.setAttribute('aria-label', TEXT.lockedLabel(number, number - 1));
    li.innerHTML = `
      <span class="level-card__number" aria-hidden="true">${number}</span>
      <span class="level-card__badge level-card__badge--lock">${ICON_LOCK}</span>
      <span class="level-card__detail" aria-hidden="true"></span>`;
    li.querySelector('.level-card__detail')!.textContent = TEXT.cardLocked(number - 1);
    return li;
  }

  const detail =
    card.status === 'in-progress'
      ? TEXT.cardInProgress(card.progressMoves)
      : card.status === 'completed' && card.best
        ? TEXT.cardBest(card.best.moves, card.best.pushes)
        : TEXT.cardAvailable;
  const extra = [card.best ? TEXT.cardCompleted : '', card.isCurrent ? TEXT.cardCurrent : '']
    .filter(Boolean)
    .join('. ');

  const button = document.createElement('button');
  button.type = 'button';
  button.className = `level-card is-${card.status}${card.isCurrent ? ' is-current' : ''}`;
  button.dataset.index = String(card.index);
  button.setAttribute('aria-label', TEXT.cardLabel(number, card.name, [detail, extra].filter(Boolean).join('. ')));
  button.innerHTML = `
    <span class="level-card__number" aria-hidden="true">${number}</span>
    ${card.best ? `<span class="level-card__badge level-card__badge--done">${ICON_CHECK}</span>` : ''}
    <span class="level-card__name" aria-hidden="true"></span>
    <span class="level-card__detail" aria-hidden="true"></span>`;
  button.querySelector('.level-card__name')!.textContent = card.name;
  button.querySelector('.level-card__detail')!.textContent = detail;
  li.append(button);
  return li;
}
