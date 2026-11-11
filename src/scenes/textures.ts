import Phaser from 'phaser';

/**
 * Procedurally drawn tile textures (no downloaded assets).
 * Every visual is registered under a texture key; swapping in sprite art later
 * means loading images under the same keys and deleting this file.
 */
export const TILE = 128;

export const TEX = {
  floor: 'floor',
  goal: 'goal',
  wall: 'wall',
  crate: 'crate',
  crateOnGoal: 'crate-on-goal',
  player: 'player',
} as const;

const C = {
  floor: 0xe8dcc8,
  floorLine: 0xd6c6aa,
  wall: 0x68786b,
  wallLight: 0x7d8e80,
  wallDark: 0x55635a,
  crate: 0xb97b46,
  crateDark: 0x7a4e2a,
  crateLight: 0xcb9161,
  goal: 0xd9a441,
  goalDark: 0x7a5a17,
  player: 0x4f6d9a,
  playerDark: 0x2f4566,
  playerLight: 0x7f9cc4,
  ink: 0x292524,
  page: 0xf5efe4,
  shadow: 0x292524,
} as const;

export function createTextures(scene: Phaser.Scene): void {
  const make = (key: string, draw: (g: Phaser.GameObjects.Graphics) => void) => {
    if (scene.textures.exists(key)) return;
    const g = scene.make.graphics({}, false);
    draw(g);
    g.generateTexture(key, TILE, TILE);
    g.destroy();
  };

  make(TEX.floor, drawFloor);

  make(TEX.goal, (g) => {
    drawFloor(g);
    drawGoalMark(g, 1);
  });

  make(TEX.wall, (g) => {
    g.fillStyle(C.wallDark, 1);
    g.fillRoundedRect(2, 2, TILE - 4, TILE - 4, 14);
    g.fillStyle(C.wall, 1);
    g.fillRoundedRect(2, 2, TILE - 4, TILE - 12, 14);
    g.fillStyle(C.wallLight, 1);
    g.fillRoundedRect(14, 12, TILE - 28, 10, 5);
  });

  make(TEX.crate, (g) => drawCrate(g, false));
  make(TEX.crateOnGoal, (g) => drawCrate(g, true));

  make(TEX.player, (g) => {
    const cx = TILE / 2;
    g.fillStyle(C.shadow, 0.16);
    g.fillEllipse(cx, TILE - 22, 76, 22);
    // body
    g.fillStyle(C.playerDark, 1);
    g.fillCircle(cx, cx + 2, 42);
    g.fillStyle(C.player, 1);
    g.fillCircle(cx, cx - 2, 38);
    // cap brim
    g.fillStyle(C.playerLight, 1);
    g.fillRoundedRect(cx - 30, cx - 34, 60, 16, 8);
    // face
    g.fillStyle(C.page, 1);
    g.fillCircle(cx - 13, cx + 4, 8);
    g.fillCircle(cx + 13, cx + 4, 8);
    g.fillStyle(C.ink, 1);
    g.fillCircle(cx - 12, cx + 6, 4);
    g.fillCircle(cx + 14, cx + 6, 4);
  });
}

function drawFloor(g: Phaser.GameObjects.Graphics): void {
  g.fillStyle(C.floor, 1);
  g.fillRect(0, 0, TILE, TILE);
  // Readable tile boundaries.
  g.lineStyle(2, C.floorLine, 1);
  g.strokeRect(1, 1, TILE - 2, TILE - 2);
}

/** Goal marker: a diamond with a dark outline + centre dot (shape, not just colour). */
function drawGoalMark(g: Phaser.GameObjects.Graphics, alpha: number): void {
  const c = TILE / 2;
  const r = 30;
  const diamond = [
    new Phaser.Math.Vector2(c, c - r),
    new Phaser.Math.Vector2(c + r, c),
    new Phaser.Math.Vector2(c, c + r),
    new Phaser.Math.Vector2(c - r, c),
  ];
  g.fillStyle(C.goal, alpha);
  g.fillPoints(diamond, true);
  g.lineStyle(6, C.goalDark, alpha);
  g.strokePoints(diamond, true);
  g.fillStyle(C.goalDark, alpha);
  g.fillCircle(c, c, 7);
}

function drawCrate(g: Phaser.GameObjects.Graphics, onGoal: boolean): void {
  const inset = 14;
  const size = TILE - inset * 2;
  // restrained drop shadow
  g.fillStyle(C.shadow, 0.18);
  g.fillRoundedRect(inset + 3, inset + 7, size, size, 14);

  // body
  g.fillStyle(C.crate, 1);
  g.fillRoundedRect(inset, inset, size, size, 14);
  g.lineStyle(6, onGoal ? C.goalDark : C.crateDark, 1);
  g.strokeRoundedRect(inset, inset, size, size, 14);

  // planks: inner frame + diagonal brace
  const f = inset + 14;
  const fs = TILE - f * 2;
  g.lineStyle(4, C.crateDark, 0.55);
  g.strokeRect(f, f, fs, fs);
  g.lineBetween(f, f + fs, f + fs, f);
  g.fillStyle(C.crateLight, 0.5);
  g.fillRect(inset + 8, inset + 5, size - 16, 4);

  if (onGoal) {
    // Golden outer ring + check badge: distinct by symbol, not only colour.
    g.lineStyle(6, C.goal, 1);
    g.strokeRoundedRect(inset - 7, inset - 7, size + 14, size + 14, 18);
    const c = TILE / 2;
    g.fillStyle(C.page, 1);
    g.fillCircle(c, c, 22);
    g.lineStyle(4, C.goalDark, 1);
    g.strokeCircle(c, c, 22);
    g.lineStyle(7, C.ink, 1);
    g.beginPath();
    g.moveTo(c - 11, c + 1);
    g.lineTo(c - 3, c + 9);
    g.lineTo(c + 12, c - 8);
    g.strokePath();
  }
}
