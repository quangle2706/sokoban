import { createGame, isSolved, notationOf, type Game, type Level } from '../engine/index.ts';
import type { SoundPlayer } from '../audio/sound.ts';
import type { LevelDefinition } from '../levels/levels.ts';
import type { BoardView } from '../scenes/BoardView.ts';
import {
  isUnlocked,
  levelStatus,
  recordCompletion,
  recordRun,
  resetProgress,
  resumeGame,
  setCurrentLevel,
  startingLevelIndex,
  updateSettings,
} from '../storage/progress.ts';
import type { BestRun, SaveData } from '../storage/saveData.ts';
import type { SaveStore } from '../storage/saveStore.ts';
import { CompletionDialog } from '../ui/completionDialog.ts';
import { byId, type Hud } from '../ui/hud.ts';
import type { Command, InputController } from '../ui/input.ts';
import { LevelSelect } from '../ui/levelSelect.ts';
import type { MotionSetting } from '../ui/motion.ts';
import { HomeScreen, HowToScreen, SettingsScreen } from '../ui/screens.ts';
import { TEXT } from '../ui/strings.ts';
import { GameController } from './GameController.ts';

export interface PlayableLevel {
  readonly def: LevelDefinition;
  readonly level: Level;
}

export interface AppServices {
  readonly view: BoardView;
  readonly hud: Hud;
  readonly store: SaveStore;
  readonly sound: SoundPlayer;
  readonly motion: MotionSetting;
}

/**
 * Application shell: which screen is showing, which level is loaded, and
 * keeping save data and settings in step with play. Game rules stay in the
 * engine and the board stays in the renderer; this class only coordinates.
 *
 * Screens are modal <dialog>s. Gameplay is paused whenever any dialog is
 * open, which one rule (`updatePause`) enforces for all of them.
 */
export class App {
  private readonly levels: readonly PlayableLevel[];
  private readonly ids: readonly string[];
  private readonly services: AppServices;
  private readonly controller: GameController;
  private readonly completion: CompletionDialog;
  private readonly levelSelect: LevelSelect;
  private readonly home: HomeScreen;
  private readonly howTo: HowToScreen;
  private readonly settings: SettingsScreen;
  private input: InputController | null = null;
  private save: SaveData;
  private levelIndex = 0;
  private lastCompletion: { best: BestRun; isNewBest: boolean; firstClear: boolean } | null = null;
  private saveWarningShown = false;

  constructor(levels: readonly PlayableLevel[], services: AppServices) {
    this.levels = levels;
    this.ids = levels.map((l) => l.def.id);
    this.services = services;
    const { hud, store } = services;

    const loaded = store.load();
    this.save = loaded.data;
    this.applySettings();
    if (!store.available) this.warnSave(TEXT.saveUnavailable);
    else if (loaded.status === 'reset') hud.showNotice(TEXT.saveReset, 8000);
    else if (loaded.status === 'repaired') hud.showNotice(TEXT.saveRepaired);

    const onClose = () => this.updatePause();
    this.controller = new GameController(services.view, hud, {
      onChange: (game, solved) => this.onGameChange(game, solved),
      onCompletionShown: (game) => this.showCompletion(game),
      onFeedback: (event) => services.sound.play(event),
    });
    this.completion = new CompletionDialog({
      onNext: () => this.openLevel(this.levelIndex + 1),
      onReplay: () => this.controller.handle({ type: 'restart', repeat: false }),
      onLevels: () => this.showLevelSelect(),
      onClose,
    });
    this.levelSelect = new LevelSelect({
      onPick: (index) => {
        this.closeAllScreens();
        this.openLevel(index);
      },
      onClose,
    });
    this.home = new HomeScreen({
      onContinue: () => this.continuePlaying(),
      onLevels: () => this.showLevelSelect(),
      onHowTo: () => this.openScreen(() => this.howTo.open((tile) => services.view.tileImage(tile))),
      onSettings: () => this.openScreen(() => this.settings.open(this.save.settings, services.motion.systemPrefersReduced)),
      onClose,
    });
    this.howTo = new HowToScreen(onClose);
    this.settings = new SettingsScreen({
      onSound: (enabled) => {
        this.changeSettings({ sound: enabled });
        if (enabled) {
          services.sound.unlock(); // we are inside the click gesture
          services.sound.play('toggle');
        }
      },
      onMotion: (motion) => this.changeSettings({ motion }),
      onResetProgress: () => this.resetProgress(),
      onClose,
    });
    byId('open-menu').addEventListener('click', () => this.openHome());
  }

  /** Must be called once the input controller exists. */
  attachInput(input: InputController): void {
    this.input = input;
    this.updatePause();
  }

  get gameController(): GameController {
    return this.controller;
  }

  /** Input entry point: gameplay commands go to the controller, Esc to the menu. */
  handleCommand(command: Command): void {
    if (command.type === 'menu') this.openHome();
    else this.controller.handle(command);
  }

  /** Load where the player left off, then show the Home screen over it. */
  start(): void {
    this.openLevel(startingLevelIndex(this.save, this.ids), { announce: false });
    this.openHome();
  }

  openLevel(index: number, { announce = true } = {}): void {
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

    // Title first: the controller's board summary builds on it.
    this.services.hud.setLevel(index + 1, def.name);
    this.controller.load(resumed ?? createGame(level));
    if (announce) this.announceLevel();
  }

  openHome(): void {
    this.openScreen(() => this.home.open(...this.homeInfo()));
  }

  private homeInfo(): [{ number: number; name: string }, number, number] {
    const index = this.continueIndex();
    const done = this.ids.filter((id) => id in this.save.completed).length;
    return [{ number: index + 1, name: this.levels[index]!.def.name }, done, this.levels.length];
  }

  showLevelSelect(): void {
    this.openScreen(() =>
      this.levelSelect.open(
        this.levels.map(({ def }, index) => ({
          index,
          name: def.name,
          status: levelStatus(this.save, this.ids, index),
          best: this.save.completed[def.id],
          progressMoves: this.save.inProgress[def.id]?.length ?? 0,
          isCurrent: index === this.levelIndex,
        })),
      ),
    );
  }

  /**
   * "Chơi tiếp": back to the loaded level, unless it is already solved, in
   * which case continue with the next level the save points to.
   */
  private continueIndex(): number {
    const game = this.controller.current;
    if (game && !isSolved(game.level, game.state)) return this.levelIndex;
    return startingLevelIndex(this.save, this.ids);
  }

  private continuePlaying(): void {
    const index = this.continueIndex();
    this.closeAllScreens();
    if (index !== this.levelIndex || this.isCurrentSolved()) this.openLevel(index);
    else this.announceLevel();
  }

  private isCurrentSolved(): boolean {
    const game = this.controller.current;
    return game !== null && isSolved(game.level, game.state);
  }

  private announceLevel(): void {
    const game = this.controller.current;
    const def = this.levels[this.levelIndex]!.def;
    const n = this.levelIndex + 1;
    this.services.hud.announce(
      game && game.state.moves > 0 ? TEXT.announceResumed(n, game.state.moves) : TEXT.announceLevel(n, def.name),
    );
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
    this.services.hud.announce(TEXT.announceSolved(game.state.moves, game.state.pushes));
    this.openScreen(() =>
      this.completion.show({
        state: game.state,
        best: record.best,
        isNewBest: record.isNewBest && !record.firstClear,
        nextNumber: hasNext ? nextIndex + 1 : null,
        unlockedNext: hasNext && record.firstClear,
        allComplete: this.ids.every((id) => id in this.save.completed),
      }),
    );
  }

  private changeSettings(change: Partial<SaveData['settings']>): void {
    this.save = updateSettings(this.save, change);
    this.applySettings();
    this.persist();
  }

  private applySettings(): void {
    this.services.sound.setEnabled(this.save.settings.sound);
    this.services.motion.set(this.save.settings.motion);
  }

  private resetProgress(): void {
    this.save = resetProgress(this.save);
    this.persist();
    this.openLevel(0, { announce: false });
    this.home.update(...this.homeInfo());
    // The settings screen is on top, so confirm there (role="status" announces it).
    this.settings.showStatus(TEXT.resetDone);
  }

  private openScreen(open: () => void): void {
    open();
    this.updatePause();
  }

  private closeAllScreens(): void {
    // Close top-down so each close reveals the one below, as a user would.
    for (const dialog of [...document.querySelectorAll<HTMLDialogElement>('dialog[open]')].reverse()) {
      dialog.close();
    }
    this.updatePause();
  }

  /** Gameplay input runs only when no dialog or screen is open. */
  private updatePause(): void {
    const paused = document.querySelector('dialog[open]') !== null;
    this.controller.setPaused(paused);
    this.input?.setEnabled(!paused);
  }

  private persist(): void {
    if (!this.services.store.save(this.save)) this.warnSave(TEXT.saveUnavailable);
  }

  private warnSave(message: string): void {
    if (this.saveWarningShown) return;
    this.saveWarningShown = true;
    this.services.hud.showNotice(message, 8000);
  }
}
