/// <reference types="node" />
/**
 * Author tool: draws the app icons procedurally and writes them to
 * public/icons/ (committed, so builds do not depend on this script).
 *
 * Usage:  node scripts/make-icons.ts
 *
 * The icon is a crate on a floor tile framed by wall colour, drawn with
 * signed-distance shapes and 4x4 supersampling for smooth edges, then
 * encoded as PNG with node:zlib only (no image libraries, no downloads).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

type RGB = readonly [number, number, number];
const hex = (h: string): RGB => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as unknown as RGB;

const COLORS = {
  wall: hex('#68786B'),
  floor: hex('#E8DCC8'),
  crate: hex('#B97B46'),
  crateDark: hex('#7A4E2A'),
  shadow: hex('#292524'),
};

/** Signed distance to a rounded rectangle given by its corners (normalized units). */
function roundedRect(x: number, y: number, x0: number, y0: number, x1: number, y1: number, r: number): number {
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const qx = Math.abs(x - cx) - ((x1 - x0) / 2 - r);
  const qy = Math.abs(y - cy) - ((y1 - y0) / 2 - r);
  return Math.hypot(Math.max(qx, 0), Math.max(qy, 0)) + Math.min(Math.max(qx, qy), 0) - r;
}

/** Distance to a line segment. */
function segment(x: number, y: number, ax: number, ay: number, bx: number, by: number): number {
  const t = Math.max(0, Math.min(1, ((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / ((bx - ax) ** 2 + (by - ay) ** 2)));
  return Math.hypot(x - (ax + t * (bx - ax)), y - (ay + t * (by - ay)));
}

/** Colour of one sample point; layers are painted bottom to top. */
function sample(x: number, y: number, maskable: boolean): RGB {
  // Maskable icons get cropped to a circle/squircle by the OS: shrink the
  // artwork into the central safe zone and let the wall colour fill the rest.
  const s = maskable ? 0.78 : 1;
  const u = (x - 0.5) / s + 0.5;
  const v = (y - 0.5) / s + 0.5;

  let c: [number, number, number] = [...COLORS.wall];
  const paint = (col: RGB, alpha: number) => {
    for (let i = 0; i < 3; i++) c[i] = c[i]! * (1 - alpha) + col[i]! * alpha;
  };

  if (roundedRect(u, v, 0.12, 0.12, 0.88, 0.88, 0.1) <= 0) paint(COLORS.floor, 1);
  if (roundedRect(u, v, 0.29, 0.31, 0.75, 0.77, 0.07) <= 0) paint(COLORS.shadow, 0.18);
  const crate = roundedRect(u, v, 0.26, 0.26, 0.74, 0.74, 0.07);
  if (crate <= 0) paint(crate > -0.035 ? COLORS.crateDark : COLORS.crate, 1);
  if (crate <= -0.035) {
    const frame = Math.abs(roundedRect(u, v, 0.35, 0.35, 0.65, 0.65, 0)) <= 0.012;
    const brace = segment(u, v, 0.35, 0.65, 0.65, 0.35) <= 0.014;
    if (frame || brace) paint(COLORS.crateDark, 0.6);
  }
  return c;
}

function render(size: number, maskable: boolean): Buffer {
  const SS = 4; // supersampling per axis
  const rgba = Buffer.alloc(size * size * 4);
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      const acc = [0, 0, 0];
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          const col = sample((px + (sx + 0.5) / SS) / size, (py + (sy + 0.5) / SS) / size, maskable);
          for (let i = 0; i < 3; i++) acc[i]! += col[i]!;
        }
      }
      const o = (py * size + px) * 4;
      for (let i = 0; i < 3; i++) rgba[o + i] = Math.round(acc[i]! / (SS * SS));
      rgba[o + 3] = 255;
    }
  }
  return rgba;
}

// --- Minimal PNG encoder ------------------------------------------------------

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (const byte of buf) c = CRC_TABLE[(c ^ byte) & 0xff]! ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}

function encodePng(size: number, rgba: Buffer): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // colour type RGBA
  // Each scanline starts with filter byte 0 (none).
  const raw = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) rgba.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// --- Output -------------------------------------------------------------------

const OUT = new URL('../public/icons/', import.meta.url);
mkdirSync(OUT, { recursive: true });

const targets: { file: string; size: number; maskable: boolean }[] = [
  { file: 'icon-192.png', size: 192, maskable: false },
  { file: 'icon-512.png', size: 512, maskable: false },
  { file: 'icon-maskable-512.png', size: 512, maskable: true },
  { file: 'apple-touch-icon.png', size: 180, maskable: true },
  { file: 'favicon-32.png', size: 32, maskable: false },
];
for (const t of targets) {
  const png = encodePng(t.size, render(t.size, t.maskable));
  writeFileSync(new URL(t.file, OUT), png);
  console.log(`wrote public/icons/${t.file} (${png.length} bytes)`);
}

// Vector favicon with the same design, for crisp tabs at any DPI.
writeFileSync(
  new URL('icon.svg', OUT),
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <rect width="100" height="100" fill="#68786B"/>
  <rect x="12" y="12" width="76" height="76" rx="10" fill="#E8DCC8"/>
  <rect x="29" y="31" width="46" height="46" rx="7" fill="#292524" opacity=".18"/>
  <rect x="27.75" y="27.75" width="44.5" height="44.5" rx="5.25" fill="#B97B46" stroke="#7A4E2A" stroke-width="3.5"/>
  <path d="M35 35h30v30H35z M35 65L65 35" fill="none" stroke="#7A4E2A" stroke-opacity=".6" stroke-width="2.6"/>
</svg>
`,
);
console.log('wrote public/icons/icon.svg');
