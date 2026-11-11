import Phaser from 'phaser';
import { GameController } from './app/GameController.ts';
import { parseLevelOrThrow } from './engine/index.ts';
import { LEVELS } from './levels/levels.ts';
import { BoardScene } from './scenes/BoardScene.ts';
import type { BoardView } from './scenes/BoardView.ts';
import { CompletionDialog } from './ui/completionDialog.ts';
import { byId, Hud } from './ui/hud.ts';
import { InputController } from './ui/input.ts';
import './styles.css';

// Milestone 1 ships a single level. Level selection arrives in Milestone 2.
const LEVEL_INDEX = 0;
const definition = LEVELS[LEVEL_INDEX];
if (!definition) throw new Error('No levels defined.');
const level = parseLevelOrThrow(definition.map);

// Reduced motion follows the OS setting for now (a Settings toggle comes in
// Milestone 3). It only affects animation, never rules.
const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const reducedMotion = () => motionQuery.matches;

const boardHost = byId('board');
const hud = new Hud();
hud.setLevel(LEVEL_INDEX + 1, definition.name);

function start(view: BoardView): void {
  let controller: GameController | null = null;
  let input: InputController | null = null;

  const dialog = new CompletionDialog({
    onOpen: () => input?.setEnabled(false),
    onReplay: () => controller?.handle({ type: 'restart', repeat: false }),
    onClose: () => {
      input?.setEnabled(true);
      controller?.onDialogClosed();
    },
  });
  controller = new GameController(level, view, hud, dialog);
  input = new InputController((command) => controller?.handle(command), document.body);

  if (import.meta.env.DEV) {
    // Debug handle for manual/browser checks. Not present in production builds.
    (window as unknown as { __khoNho: unknown }).__khoNho = { controller, input };
  }
}

const game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: boardHost,
  transparent: true,
  antialias: true,
  banner: false,
  audio: { noAudio: true },
  input: { keyboard: false, mouse: false, touch: false, gamepad: false },
  scale: { mode: Phaser.Scale.NONE, width: 1, height: 1 },
  scene: new BoardScene(start, reducedMotion),
});

/**
 * Keep the canvas exactly the size of its host, at device-pixel resolution
 * for crisp shapes: the drawing buffer is CSS size x devicePixelRatio, and a
 * zoom of 1/dpr maps it back to CSS size. Only presentation changes here.
 */
function fitCanvas(): void {
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  const { width, height } = boardHost.getBoundingClientRect();
  if (width < 1 || height < 1) return;
  game.scale.setZoom(1 / dpr);
  game.scale.resize(Math.round(width * dpr), Math.round(height * dpr));
}

new ResizeObserver(fitCanvas).observe(boardHost);
window.addEventListener('resize', fitCanvas); // devicePixelRatio changes (zoom)
game.events.once(Phaser.Core.Events.READY, fitCanvas);
