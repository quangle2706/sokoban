/**
 * AUTHOR-ONLY DATA. Never import this from src/: it must not ship to players.
 *
 * Each entry is a solution in LURD notation (lowercase = walk, uppercase =
 * push), replayed through the real engine by tests/levels.test.ts.
 *
 * `verifiedMoveOptimal` is true only when the sequence was produced by the
 * exhaustive BFS in scripts/solve.ts, which guarantees the fewest MOVES. It
 * says nothing about the fewest pushes.
 */
export interface AuthorSolution {
  readonly moves: string;
  readonly verifiedMoveOptimal: boolean;
}

export const SOLUTIONS: Readonly<Record<string, AuthorSolution>> = {
  'level-01': {
    moves: 'urrrRRlllluuurrdrrrdDllllluuRRRRlDDldddlluRdrUURuLL',
    verifiedMoveOptimal: true,
  },
};
