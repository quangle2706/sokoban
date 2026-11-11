/**
 * Player-facing level definitions. Author solutions are intentionally NOT
 * stored here; they live in tests/fixtures/solutions.ts so they never ship.
 * Map format is documented in docs/GAME_RULES.md and src/engine/parseLevel.ts.
 */
export interface LevelDefinition {
  /** Stable identifier used by tests (and later by save data). */
  readonly id: string;
  /** Display name (Vietnamese, player-facing). */
  readonly name: string;
  /** One string per row; spaces are meaningful floor cells. */
  readonly map: readonly string[];
}

export const LEVELS: readonly LevelDefinition[] = [
  {
    id: 'level-01',
    name: 'Góc kho',
    map: [
      ' ########',
      ' #   #  #',
      '## $   .#',
      '#  ##$# #',
      '# .  $  #',
      '#@##  ..#',
      '#  $ ####',
      '#    #',
      '######',
    ],
  },
];
