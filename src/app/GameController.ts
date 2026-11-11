import { createGame, isSolved, restart, tryMove, undo, type Game, type Level } from '../engine/index.ts';
import type { BoardView } from '../scenes/BoardView.ts';
import type { CompletionDialog } from '../ui/completionDialog.ts';
import type { Hud } from '../ui/hud.ts';
import type { Command } from '../ui/input.ts';
import { TEXT } from '../ui/strings.ts';

/**
 * The only place that owns the current `Game` value.
 *
 * Data flow:  Command -> engine function -> new Game -> view.sync + hud.update
 *
 * Input pacing: while a move animation runs, *fresh* presses are queued
 * (FIFO, at most MAX_QUEUED) and run in order as each animation settles, so
 * quick taps are never lost. Held-key *repeats* are dropped while animating,
 * so holding a key never builds up a backlog. Restart clears the queue.
 */
const MAX_QUEUED = 4;

export class GameController {
  private game: Game;
  private readonly queue: Command[] = [];
  private readonly view: BoardView;
  private readonly hud: Hud;
  private readonly dialog: CompletionDialog;

  constructor(level: Level, view: BoardView, hud: Hud, dialog: CompletionDialog) {
    this.view = view;
    this.hud = hud;
    this.dialog = dialog;
    this.game = createGame(level);
    view.showLevel(level, this.game.state);
    this.refreshHud();
  }

  /** Read-only snapshot, handy for debugging and browser checks. */
  get current(): Game {
    return this.game;
  }

  handle(command: Command): void {
    if (this.dialog.isOpen) return;

    if (command.type === 'restart') {
      this.queue.length = 0;
      this.game = restart(this.game);
      this.view.sync(this.game.state, { animate: false });
      this.refreshHud();
      this.hud.announce(TEXT.announceRestart);
      return;
    }

    if (this.view.isAnimating) {
      if (!command.repeat && this.queue.length < MAX_QUEUED) this.queue.push(command);
      return;
    }

    if (command.type === 'undo') {
      const result = undo(this.game);
      if (!result.undone) return this.flushBuffer();
      this.game = result.game;
      this.view.sync(this.game.state, { animate: true }, this.flushBuffer);
      this.refreshHud();
      this.hud.announce(TEXT.announceUndo);
      return;
    }

    const result = tryMove(this.game, command.direction);
    if (result.kind === 'blocked') {
      if (result.reason === 'solved') this.hud.showStatus(TEXT.solvedStatus);
      else this.view.bump(command.direction);
      // No animation will settle, so keep draining queued presses now.
      return this.flushBuffer();
    }

    this.game = result.game;
    this.refreshHud({ solvedStatus: false }); // the dialog announces the win instead
    this.view.sync(this.game.state, { animate: true, facing: command.direction }, () => {
      if (result.solved) {
        this.queue.length = 0;
        this.hud.announce(TEXT.announceSolved(this.game.state.moves, this.game.state.pushes));
        this.dialog.show(this.game.state);
      } else {
        this.flushBuffer();
      }
    });
  }

  /** Called when the completion dialog closes. */
  onDialogClosed(): void {
    this.refreshHud();
  }

  private flushBuffer = (): void => {
    const next = this.queue.shift();
    if (next) this.handle(next);
  };

  private refreshHud({ solvedStatus = true } = {}): void {
    this.hud.update(this.game.state);
    const solved = isSolved(this.game.level, this.game.state);
    this.hud.showStatus(solved && solvedStatus && !this.dialog.isOpen ? TEXT.solvedStatus : null);
  }
}
