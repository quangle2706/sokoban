import Phaser from 'phaser';
import {
  playableArea,
  terrainAt,
  type Direction,
  type GameState,
  type Level,
  type Position,
} from '../engine/index.ts';
import type { BoardView, TileName } from './BoardView.ts';
import { createTextures, TEX, TILE } from './textures.ts';

export const MOVE_DURATION_MS = 110;
const BOARD_PADDING = 0.25; // in tiles, around the board

/**
 * Phaser implementation of BoardView.
 *
 * Everything is laid out in *board units* (1 tile = TILE units) inside a
 * single container. Fitting the board to the screen only changes that
 * container's scale and position, so resizing never touches game state.
 */
export class BoardScene extends Phaser.Scene implements BoardView {
  private board!: Phaser.GameObjects.Container;
  private terrainLayer!: Phaser.GameObjects.Container;
  private player!: Phaser.GameObjects.Image;
  private crates: Phaser.GameObjects.Image[] = [];
  private level: Level | null = null;
  private state: GameState | null = null;
  /** Movement tweens of the latest sync(); empty when the board is at rest. */
  private readonly moveTweens = new Set<Phaser.Tweens.Tween>();
  /** Incremented per sync() so callbacks from interrupted animations are ignored. */
  private generation = 0;
  private readonly onReady: (view: BoardView) => void;
  private readonly reducedMotion: () => boolean;

  constructor(onReady: (view: BoardView) => void, reducedMotion: () => boolean) {
    super('board');
    this.onReady = onReady;
    this.reducedMotion = reducedMotion;
  }

  get isAnimating(): boolean {
    return this.moveTweens.size > 0;
  }

  create(): void {
    createTextures(this);
    this.board = this.add.container(0, 0);
    this.terrainLayer = this.add.container(0, 0);
    this.board.add(this.terrainLayer);
    this.player = this.add.image(0, 0, TEX.player);
    this.board.add(this.player);

    this.scale.on(Phaser.Scale.Events.RESIZE, this.layout, this);
    this.onReady(this);
  }

  showLevel(level: Level, state: GameState): void {
    this.level = level;
    this.stopMovement();
    this.terrainLayer.removeAll(true);
    for (const crate of this.crates) crate.destroy();
    this.crates = [];

    // Floor is drawn only inside the walls (the region the player can reach),
    // so space characters outside the walls stay page background.
    const inside = playableArea(level);
    for (let y = 0; y < level.height; y++) {
      for (let x = 0; x < level.width; x++) {
        const t = terrainAt(level, { x, y });
        const key =
          t === 'wall' ? TEX.wall : t === 'goal' ? TEX.goal : inside.has(y * level.width + x) ? TEX.floor : null;
        if (!key) continue;
        const { px, py } = toBoard({ x, y });
        this.terrainLayer.add(this.add.image(px, py, key));
      }
    }

    this.crates = state.crates.map(() => this.add.image(0, 0, TEX.crate));
    this.board.add(this.crates);
    this.board.bringToTop(this.player);

    this.sync(state, { animate: false });
    this.layout();
  }

  sync(state: GameState, options: { animate: boolean; facing?: Direction }, onSettled?: () => void): void {
    if (!this.level) return;
    const level = this.level;
    this.state = state;
    const animate = options.animate && !this.reducedMotion();
    if (options.facing === 'left') this.player.setFlipX(true);
    else if (options.facing === 'right') this.player.setFlipX(false);

    const targets: { obj: Phaser.GameObjects.Image; to: Position }[] = [
      { obj: this.player, to: state.player },
      ...state.crates.map((to, i) => ({ obj: this.crates[i]!, to })),
    ];

    const landed = new Set<Phaser.GameObjects.Image>();
    state.crates.forEach((c, i) => {
      // Texture swaps immediately so the "on goal" symbol is never stale.
      const crate = this.crates[i]!;
      const key = terrainAt(level, c) === 'goal' ? TEX.crateOnGoal : TEX.crate;
      if (key === TEX.crateOnGoal && crate.texture.key !== key) landed.add(crate);
      crate.setTexture(key);
    });

    this.stopMovement();
    const generation = this.generation;

    for (const { obj, to } of targets) {
      const { px, py } = toBoard(to);
      // Cancel cosmetic effects (bump, pulse, celebration) and their scale.
      this.tweens.killTweensOf(obj);
      obj.setScale(1);
      if (!animate || (obj.x === px && obj.y === py)) {
        obj.setPosition(px, py);
        continue;
      }
      const tween = this.tweens.add({
        targets: obj,
        x: px,
        y: py,
        duration: MOVE_DURATION_MS,
        ease: 'Quad.easeOut',
        onComplete: () => {
          if (generation !== this.generation) return;
          this.moveTweens.delete(tween);
          if (landed.has(obj)) this.pulse(obj);
          if (this.moveTweens.size === 0) onSettled?.();
        },
      });
      this.moveTweens.add(tween);
    }
    if (this.moveTweens.size === 0) onSettled?.();
  }

  /**
   * Win celebration: crates bounce one after another, then the player hops.
   * Cosmetic only; skipped entirely under reduced motion. `onDone` always runs.
   */
  celebrate(onDone: () => void): void {
    if (this.reducedMotion()) {
      onDone();
      return;
    }
    const generation = this.generation;
    const stagger = 90;
    const targets = [...this.crates, this.player];
    targets.forEach((obj, i) => {
      this.tweens.add({
        targets: obj,
        scale: obj === this.player ? 1.18 : 1.14,
        duration: 140,
        delay: i * stagger,
        yoyo: true,
        ease: 'Sine.easeOut',
      });
    });
    const total = (targets.length - 1) * stagger + 280 + 120;
    this.time.delayedCall(total, () => {
      // A newer sync (e.g. undo during the celebration) cancels the rest.
      if (generation === this.generation) onDone();
    });
  }

  /** Data URL of a board texture, so the how-to screen shows the real tiles. */
  tileImage(tile: TileName): string {
    return this.textures.getBase64(TEX[tile]);
  }

  /** Small "landed on a goal" pulse. */
  private pulse(obj: Phaser.GameObjects.Image): void {
    if (this.reducedMotion()) return;
    this.tweens.add({ targets: obj, scale: 1.1, duration: 80, yoyo: true, ease: 'Sine.easeOut' });
  }

  /** Snap any running movement to its end and forget its callbacks. */
  private stopMovement(): void {
    this.generation++;
    for (const tween of this.moveTweens) tween.complete();
    this.moveTweens.clear();
  }

  bump(direction: Direction): void {
    if (this.reducedMotion() || this.isAnimating || !this.state) return;
    const { px, py } = toBoard(this.state.player);
    const d = TILE * 0.08;
    const dx = direction === 'left' ? -d : direction === 'right' ? d : 0;
    const dy = direction === 'up' ? -d : direction === 'down' ? d : 0;
    this.tweens.killTweensOf(this.player);
    this.player.setPosition(px, py);
    this.tweens.add({
      targets: this.player,
      x: px + dx,
      y: py + dy,
      duration: 60,
      yoyo: true,
      ease: 'Sine.easeOut',
      onComplete: () => this.player.setPosition(px, py),
    });
  }

  /** Fit the board into the canvas, centred, keeping its aspect ratio. */
  private layout(): void {
    if (!this.level) return;
    const { width, height } = this.scale;
    const boardW = (this.level.width + BOARD_PADDING * 2) * TILE;
    const boardH = (this.level.height + BOARD_PADDING * 2) * TILE;
    const scale = Math.min(width / boardW, height / boardH);
    this.board.setScale(scale);
    this.board.setPosition(
      (width - this.level.width * TILE * scale) / 2,
      (height - this.level.height * TILE * scale) / 2,
    );
  }
}

/** Grid cell -> centre point in board units. */
function toBoard(p: Position): { px: number; py: number } {
  return { px: p.x * TILE + TILE / 2, py: p.y * TILE + TILE / 2 };
}
