import { createGame, notationOf, type Game, type Level } from '../engine/index.ts';
import type { LevelDefinition } from '../levels/levels.ts';
import type { BoardView } from '../scenes/BoardView.ts';
import {
  isUnlocked,
  levelStatus,
  recordCompletion,
  recordRun,
  resumeGame,
  setCurrentLevel,
  startingLevelIndex,
} from '../storage/progress.ts';
import type { BestRun, SaveData } from '../storage/saveData.ts';
import type { SaveStore } from '../storage/saveStore.ts';
import { CompletionDialog } from '../ui/completionDialog.ts';
import { byId, type Hud } from '../ui/hud.ts';
import type { InputController } from '../ui/input.ts';
import { LevelSelect } from '../ui/levelSelect.ts';
import { TEXT } from '../ui/strings.ts';
import { GameController } from './GameController.ts';

export interface PlayableLevel {
  readonly def: LevelDefinition;
  readonly level: Level;
}

/**
 * Application shell: which screen is showing, which level is loaded, and
 * keeping save data in step with play. Game rules stay in the engine; the
 * board stays in the renderer; this class only coordinates.
 */
export class App {
  private readonly levels: readonly PlayableLevel[];
  private readonly ids: readonly string[];
  private readonly store: SaveStore;
  private readonly hud: Hud;
  private readonly controller: GameController;
  private readonly completion: CompletionDialog;
  private readonly levelSelect: LevelSelect;
  private input: InputController | null = null;
  private save: SaveData;
  private levelIndex = 0;
  private lastCompletion: { best: BestRun; isNewBest: boolean; firstClear: boolean } | null = null;
  private saveWarningShown = false;

  constructor(levels: readonly PlayableLevel[], view: BoardView, hud: Hud, store: SaveStore) {
    this.levels = levels;
    this.ids = levels.map((l) => l.def.id);
    this.store = store;
    this.hud = hud;

    const loaded = store.load();
    this.save = loaded.data;
    if (!store.available) this.warnSave(TEXT.saveUnavailable);
    else if (loaded.status === 'reset') hud.showNotice(TEXT.saveReset, 8000);
    else if (loaded.status === 'repaired') hud.showNotice(TEXT.saveRepaired);

    this.controller = new GameController(view, hud, {
      onChange: (game, solved) => this.onGameChange(game, solved),
      onCompletionShown: (game) => this.showCompletion(game),
    });
    this.completion = new CompletionDialog({
      onNext: () => this.openLevel(this.levelIndex + 1),
      onReplay: () => this.controller.handle({ type: 'restart', repeat: false }),
      onLevels: () => this.showLevelSelect(),
      onClose: () => this.updatePause(),
    });
    this.levelSelect = new LevelSelect({
      onPick: (index) => this.openLevel(index),
      onClose: () => this.updatePause(),
    });
    byId('open-levels').addEventListener('click', () => this.showLevelSelect());
  }

  /** Must be called once the input controller exists. */
  attachInput(input: InputController): void {
    this.input = input;
    this.updatePause();
  }

  get gameController(): GameController {
    return this.controller;
  }

  /** Resume where the player left off (or start at the first open level). */
  start(): void {
    this.openLevel(startingLevelIndex(this.save, this.ids), { announceResume: true });
  }

  openLevel(index: number, { announceResume = false } = {}): void {
    const entry = this.levels[index];
    if (!entry || !isUnlocked(this.save, this.ids, index)) return;
    this.levelIndex = index;
    const { def, level } = entry;

    const saved = this.save.inProgress[def.id];
    const resumed = resumeGame(level, saved);
    if (saved && !resumed) {
      // The saved run no longer fits this level: drop it and start fresh.
      this.save = recordRun(this.save, def.id, '');
    }
    this.save = setCurrentLevel(this.save, def.id);
    this.persist();

    this.controller.load(resumed ?? createGame(level));
    this.hud.setLevel(index + 1, def.name);
    this.hud.announce(
      resumed && announceResume
        ? TEXT.announceResumed(index + 1, resumed.state.moves)
        : TEXT.announceLevel(index + 1, def.name),
    );
  }

  showLevelSelect(): void {
    this.levelSelect.open(
      this.levels.map(({ def }, index) => ({
        index,
        name: def.name,
        status: levelStatus(this.save, this.ids, index),
        best: this.save.completed[def.id],
        progressMoves: this.save.inProgress[def.id]?.length ?? 0,
        isCurrent: index === this.levelIndex,
      })),
    );
    this.updatePause();
  }

  private onGameChange(game: Game, solved: boolean): void {
    const id = this.ids[this.levelIndex]!;
    if (solved) {
      const nextId = this.ids[this.levelIndex + 1] ?? null;
      const record = recordCompletion(this.save, id, { moves: game.state.moves, pushes: game.state.pushes }, nextId);
      this.save = record.save;
      this.lastCompletion = record;
    } else {
      this.save = recordRun(this.save, id, notationOf(game));
    }
    this.persist();
  }

  private showCompletion(game: Game): void {
    const record = this.lastCompletion;
    if (!record) return;
    const nextIndex = this.levelIndex + 1;
    const hasNext = nextIndex < this.levels.length;
    this.hud.announce(TEXT.announceSolved(game.state.moves, game.state.pushes));
    this.completion.show({
      state: game.state,
      best: record.best,
      isNewBest: record.isNewBest && !record.firstClear,
      nextNumber: hasNext ? nextIndex + 1 : null,
      unlockedNext: hasNext && record.firstClear,
      allComplete: this.ids.every((id) => id in this.save.completed),
    });
    this.updatePause();
  }

  /** Gameplay input runs only when no dialog or other screen is open. */
  private updatePause(): void {
    const paused = this.completion.isOpen || this.levelSelect.isOpen;
    this.controller.setPaused(paused);
    this.input?.setEnabled(!paused);
  }

  private persist(): void {
    if (!this.store.save(this.save)) this.warnSave(TEXT.saveUnavailable);
  }

  private warnSave(message: string): void {
    if (this.saveWarningShown) return;
    this.saveWarningShown = true;
    this.hud.showNotice(message, 8000);
  }
}
