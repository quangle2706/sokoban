import type { Direction, GameState, Level } from '../engine/index.ts';

export type TileName = 'floor' | 'goal' | 'wall' | 'crate' | 'crateOnGoal' | 'player';

/**
 * What the app needs from a renderer. The Phaser implementation lives in
 * BoardScene.ts; any other renderer (sprites, DOM, a test fake) can replace it
 * as long as it honors this contract.
 *
 * The renderer only ever *displays* engine state. It never decides rules.
 */
export interface BoardView {
  /** Build the static board for a level and place entities at `state`. */
  showLevel(level: Level, state: GameState): void;
  /**
   * Bring the display to `state`. Entities whose grid position changed glide
   * there when `animate` is true. `onSettled` runs once everything is in
   * place (synchronously when not animating).
   */
  sync(state: GameState, options: { animate: boolean; facing?: Direction }, onSettled?: () => void): void;
  /** Small "can't go there" nudge. Purely cosmetic and never blocks input. */
  bump(direction: Direction): void;
  /**
   * Cosmetic win effect. `onDone` runs when it finishes, immediately under
   * reduced motion, and never if a newer sync() interrupts it.
   */
  celebrate(onDone: () => void): void;
  /** Image (data URL) of a board tile, e.g. for a legend. */
  tileImage(tile: TileName): string;
  /** True while a movement animation is running. */
  readonly isAnimating: boolean;
}
