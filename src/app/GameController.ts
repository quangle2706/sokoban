import { isSolved, restart, terrainAt, tryMove, undo, type Game, type GameState } from '../engine/index.ts';
import type { BoardView } from '../scenes/BoardView.ts';
import type { Hud } from '../ui/hud.ts';
import type { Command } from '../ui/input.ts';
import { TEXT } from '../ui/strings.ts';

/** Things worth a sound (or any other feedback) — no rules, no UI. */
export type GameFeedback = 'step' | 'push' | 'goal' | 'blocked' | 'undo' | 'restart' | 'win';

export interface GameHooks {
  /**
   * Called immediately after every successful move, undo or restart, before
   * any animation, so progress is saved even if the page closes mid-glide.
   */
  onChange(game: Game, solved: boolean): void;
  /** Called after the winning glide and the celebration have finished. */
  onCompletionShown(game: Game): void;
  /** Feedback events, e.g. for sound effects. */
  onFeedback(event: GameFeedback): void;
}

/**
 * Owns the current `Game` value for the level being played.
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
  private game: Game | null = null;
  private paused = false;
  private readonly queue: Command[] = [];
  private readonly view: BoardView;
  private readonly hud: Hud;
  private readonly hooks: GameHooks;

  constructor(view: BoardView, hud: Hud, hooks: GameHooks) {
    this.view = view;
    this.hud = hud;
    this.hooks = hooks;
  }

  /** Show a game (fresh or resumed) for its level. */
  load(game: Game): void {
    this.queue.length = 0;
    this.game = game;
    this.view.showLevel(game.level, game.state);
    this.refreshHud();
  }

  /** Read-only snapshot, handy for debugging and browser checks. */
  get current(): Game | null {
    return this.game;
  }

  /** While paused (a dialog or another screen is open) commands are ignored. */
  setPaused(paused: boolean): void {
    this.paused = paused;
    if (paused) this.queue.length = 0;
    this.refreshHud();
  }

  handle(command: Command): void {
    const game = this.game;
    if (this.paused || !game || command.type === 'menu') return; // menu is the App's job

    if (command.type === 'restart') {
      this.queue.length = 0;
      this.game = restart(game);
      this.view.sync(this.game.state, { animate: false });
      this.refreshHud();
      this.hooks.onChange(this.game, false);
      this.hooks.onFeedback('restart');
      this.hud.announce(TEXT.announceRestart);
      return;
    }

    if (this.view.isAnimating) {
      if (!command.repeat && this.queue.length < MAX_QUEUED) this.queue.push(command);
      return;
    }

    if (command.type === 'undo') {
      const result = undo(game);
      if (!result.undone) return this.flushQueue();
      this.game = result.game;
      this.view.sync(this.game.state, { animate: true }, this.flushQueue);
      this.refreshHud();
      this.hooks.onChange(this.game, false);
      this.hooks.onFeedback('undo');
      this.hud.announce(`${TEXT.announceUndo} ${this.goalSummary(this.game.state)}`);
      return;
    }

    const result = tryMove(game, command.direction);
    if (result.kind === 'blocked') {
      if (result.reason === 'solved') this.hud.showStatus(TEXT.solvedStatus);
      else {
        this.view.bump(command.direction);
        // Holding a key against a wall should not buzz repeatedly.
        if (!command.repeat) this.hooks.onFeedback('blocked');
      }
      // No animation will settle, so keep draining queued presses now.
      return this.flushQueue();
    }

    const next = result.game;
    const before = this.filledGoals(game.state);
    const after = this.filledGoals(next.state);
    this.game = next;
    this.refreshHud({ solvedStatus: false }); // the dialog announces the win instead
    this.hooks.onChange(next, result.solved);
    if (result.kind === 'pushed') {
      this.hooks.onFeedback(after > before && !result.solved ? 'goal' : 'push');
      if (after !== before && !result.solved) this.hud.announce(this.goalSummary(next.state));
    } else {
      this.hooks.onFeedback('step');
    }
    this.view.sync(next.state, { animate: true, facing: command.direction }, () => {
      // `this.game === next` guards against undo or a level switch meanwhile.
      if (result.solved && this.game === next) {
        this.queue.length = 0;
        this.hooks.onFeedback('win');
        this.view.celebrate(() => {
          if (this.game === next) this.hooks.onCompletionShown(next);
        });
      } else {
        this.flushQueue();
      }
    });
  }

  private flushQueue = (): void => {
    const next = this.queue.shift();
    if (next) this.handle(next);
  };

  private filledGoals(state: GameState): number {
    const level = this.game!.level;
    return state.crates.filter((c) => terrainAt(level, c) === 'goal').length;
  }

  private goalSummary(state: GameState): string {
    return TEXT.goalsFilled(this.filledGoals(state), state.crates.length);
  }

  private refreshHud({ solvedStatus = true } = {}): void {
    if (!this.game) return;
    this.hud.update(this.game.state);
    this.hud.setBoardSummary(this.goalSummary(this.game.state));
    const solved = isSolved(this.game.level, this.game.state);
    this.hud.showStatus(solved && solvedStatus && !this.paused ? TEXT.solvedStatus : null);
  }
}
