import { describe, expect, it } from 'vitest';
import { contrastRatio } from '../src/ui/color.ts';

/**
 * Contrast audit of the palette (values mirror src/styles.css :root and
 * src/scenes/textures.ts). WCAG 2.x thresholds:
 *   - text: 4.5:1 (AA, normal size)
 *   - meaningful non-text shapes (tile edges, icons, focus rings): 3:1
 * Goal and crate fills are allowed to be low-contrast because their dark
 * outlines and symbols (diamond, check mark) carry the meaning.
 */
const TEXT_PAIRS: [string, string, string][] = [
  ['body text on page', '#292524', '#f5efe4'],
  ['body text on surface', '#292524', '#fffaf2'],
  ['muted text on page', '#57534e', '#f5efe4'],
  ['muted text on surface', '#57534e', '#fffaf2'],
  ['muted text on locked card', '#57534e', '#efe7da'],
  ['white on primary button', '#ffffff', '#4f6d9a'],
  ['white on danger button', '#ffffff', '#a33a2b'],
  ['page text on status pill', '#f5efe4', '#292524'],
  ['text on goal badge', '#292524', '#d9a441'],
  ['danger outline text on surface', '#8a2f22', '#fffaf2'],
];

const SHAPE_PAIRS: [string, string, string][] = [
  ['wall vs floor', '#68786b', '#e8dcc8'],
  ['crate outline vs floor', '#7a4e2a', '#e8dcc8'],
  ['goal outline vs floor', '#7a5a17', '#e8dcc8'],
  ['crate-on-goal ring edge vs floor', '#7a5a17', '#e8dcc8'],
  ['crate-on-goal check badge vs crate', '#f5efe4', '#b97b46'],
  ['lock icon on lock badge', '#f5efe4', '#68786b'],
  ['player vs floor', '#4f6d9a', '#e8dcc8'],
  ['check mark on badge', '#292524', '#f5efe4'],
  ['focus ring vs page', '#4f6d9a', '#f5efe4'],
  ['focus ring vs surface', '#4f6d9a', '#fffaf2'],
  ['completed card border vs surface', '#7a5a17', '#fffaf2'],
];

describe('contrast audit', () => {
  it('computes known reference ratios', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrastRatio('#777777', '#777777')).toBeCloseTo(1, 5);
  });

  for (const [name, fg, bg] of TEXT_PAIRS) {
    it(`text: ${name} >= 4.5`, () => {
      expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(4.5);
    });
  }

  for (const [name, fg, bg] of SHAPE_PAIRS) {
    it(`shape: ${name} >= 3`, () => {
      expect(contrastRatio(fg, bg)).toBeGreaterThanOrEqual(3);
    });
  }
});
