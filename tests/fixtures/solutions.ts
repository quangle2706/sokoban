/**
 * AUTHOR-ONLY DATA. Never import this from src/: it must not ship to players.
 *
 * `moves` is a solution in LURD notation (lowercase = walk, uppercase = push).
 * tests/levels.test.ts replays every one through the real engine.
 *
 * The optimality fields record what the exhaustive searches in
 * scripts/solve.ts proved when the level was authored (re-run them after
 * editing a map):
 *   - `moveOptimal: true`: `moves` has the fewest possible moves
 *     (`node scripts/solve.ts --moves <id>`).
 *   - `minPushes`: the fewest pushes any solution needs
 *     (`node scripts/solve.ts <id>`). The move-optimal solution may use more
 *     pushes than this, and a push-optimal solution may use more moves.
 */
export interface AuthorSolution {
  readonly moves: string;
  readonly moveOptimal: boolean;
  readonly minPushes: number;
}

export const SOLUTIONS: Readonly<Record<string, AuthorSolution>> = {
  'buoc-dau': { moves: 'LdrdL', moveOptimal: true, minPushes: 2 },
  'hai-ben': { moves: 'uulLulDrrrrRurD', moveOptimal: true, minPushes: 4 },
  'goc-nho': { moves: 'luURuLdddrruUruL', moveOptimal: true, minPushes: 5 },
  'loi-hep': { moves: 'uuurDrdLdllluuRRurD', moveOptimal: true, minPushes: 3 },
  'ke-hang': { moves: 'ulLuuuulDDrdLDuuurrrDDrdLLdlU', moveOptimal: true, minPushes: 10 },
  'nga-re': { moves: 'urrruuLLDllluurRDrrruullDurrddlLrrddlL', moveOptimal: true, minPushes: 8 },
  'hanh-lang': {
    moves: 'uurrrRuurrddLLuullLddlluuRRuuurrdLulDDDDuRRlluurrrRurDDDD',
    moveOptimal: true,
    minPushes: 18,
  },
  'bac-thang': {
    moves: 'luuRRluurrdDlllluRdrrruullDurrddlLullddrdrrRRllURR',
    moveOptimal: true,
    minPushes: 11,
  },
  'doi-xung': { moves: 'ullDuuurrrDrdLLLUluRddrddrrUdllldlluRR', moveOptimal: true, minPushes: 8 },
  'goc-kho': {
    moves: 'urrrRRlllluuurrdrrrdDllllluuRRRRlDDldddlluRdrUURuLL',
    moveOptimal: true,
    minPushes: 15,
  },
};
