import Phaser from 'phaser';
import { App } from './app/App.ts';
import { SoundPlayer } from './audio/sound.ts';
import { parseLevelOrThrow } from './engine/index.ts';
import { LEVELS } from './levels/levels.ts';
import { BoardScene } from './scenes/BoardScene.ts';
import type { BoardView } from './scenes/BoardView.ts';
import { browserStorage, SaveStore } from './storage/saveStore.ts';
import { byId, Hud } from './ui/hud.ts';
import { InputController } from './ui/input.ts';
import { MotionSetting } from './ui/motion.ts';
import './styles.css';

// Bundled levels are validated by the test suite; parsing here only fails on
// a broken build, so failing loudly is right.
const levels = LEVELS.map((def) => ({ def, level: parseLevelOrThrow(def.map) }));

// One reduced-motion decision (setting + OS preference) shared by the
// renderer and CSS. It only affects animation, never rules.
const motion = new MotionSetting();
const reducedMotion = () => motion.reduced;

const boardHost = byId('board');

function start(view: BoardView): void {
  const app = new App(levels, {
    view,
    hud: new Hud(),
    store: new SaveStore(browserStorage()),
    sound: new SoundPlayer(false), // enabled from saved settings by App
    motion,
  });
  const input = new InputController((command) => app.handleCommand(command), document.body);
  app.attachInput(input);
  app.start();

  if (import.meta.env.DEV) {
    // Debug handle for manual/browser checks. Not present in production builds.
    (window as unknown as { __khoNho: unknown }).__khoNho = { app, controller: app.gameController, input };
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
