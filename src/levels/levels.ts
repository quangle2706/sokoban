/**
 * Player-facing level definitions, in play order (index 0 = "Màn 1").
 *
 * - `id` is a stable slug used by save data: never change or reuse one.
 *   Reordering levels is safe; renaming an id orphans its saved progress.
 * - Author solutions are NOT stored here; they live in
 *   tests/fixtures/solutions.ts so they never ship to players.
 * - Map format: docs/GAME_RULES.md and src/engine/parseLevel.ts.
 * - All levels are original designs for Kho Nhỏ.
 */
export interface LevelDefinition {
  /** Stable identifier (ASCII slug) used by save data and tests. */
  readonly id: string;
  /** Display name (Vietnamese, player-facing). */
  readonly name: string;
  /** One string per row; spaces are meaningful floor cells. */
  readonly map: readonly string[];
}

export const LEVELS: readonly LevelDefinition[] = [
  {
    id: 'buoc-dau',
    name: 'Bước đầu',
    map: [
      '#######',
      '#     #',
      '# .$@ #',
      '#     #',
      '# .$  #',
      '#     #',
      '#######',
    ],
  },
  {
    id: 'hai-ben',
    name: 'Hai bên',
    map: [
      '#########',
      '#   #   #',
      '# $   $ #',
      '#.## ##.#',
      '#   @   #',
      '#########',
    ],
  },
  {
    id: 'goc-nho',
    name: 'Góc nhỏ',
    map: [
      '#######',
      '#. .  #',
      '# $$  #',
      '#  #  #',
      '#  @  #',
      '#######',
    ],
  },
  {
    id: 'loi-hep',
    name: 'Lối hẹp',
    map: [
      '########',
      '#  #   #',
      '#  $ $ #',
      '## #.. #',
      ' #  @  #',
      ' #######',
    ],
  },
  {
    id: 'ke-hang',
    name: 'Kệ hàng',
    map: [
      '  ####',
      '###  ####',
      '#  $    #',
      '# #  #$ #',
      '# . .#  #',
      '### $   #',
      '  #.  @##',
      '  ######',
    ],
  },
  {
    id: 'nga-re',
    name: 'Ngã rẽ',
    map: [
      '   #####',
      '####   #',
      '#  $ # ##',
      '# #. $  #',
      '#  .$#  #',
      '## .   ##',
      ' # @ ###',
      ' #####',
    ],
  },
  {
    id: 'hanh-lang',
    name: 'Hành lang dài',
    map: [
      '  ########',
      '  #   #  #',
      '  # $  $ #',
      '### #### #',
      '#  $  .  #',
      '# # ## # #',
      '#  . .$ .#',
      '## # #####',
      ' #@  #',
      ' #####',
    ],
  },
  {
    id: 'bac-thang',
    name: 'Bậc thang',
    map: [
      '  #####',
      '###   #',
      '# $ # #',
      '# .$. ###',
      '#  #$  .#',
      '## @ $ .#',
      ' #  ##  #',
      ' ########',
    ],
  },
  {
    id: 'doi-xung',
    name: 'Đối xứng',
    map: [
      ' #######',
      '##  .  ##',
      '#  $#$  #',
      '# .   . #',
      '##$#@#$##',
      '#   .   #',
      '#   #   #',
      '#########',
    ],
  },
  {
    id: 'goc-kho',
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
