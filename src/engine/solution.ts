import { createGame, tryMove } from './game.ts';
import type { Direction, Game, Level } from './types.ts';

/**
 * Solutions use the common LURD notation:
 *   u d l r  = walk up/down/left/right
 *   U D L R  = push up/down/left/right
 * Whitespace is ignored so long solutions can be wrapped.
 */
const LETTERS: Readonly<Record<string, Direction>> = {
  u: 'up',
  d: 'down',
  l: 'left',
  r: 'right',
};

export interface SolutionStep {
  readonly direction: Direction;
  readonly expectPush: boolean;
}

export function parseSolution(text: string): SolutionStep[] {
  const steps: SolutionStep[] = [];
  for (const ch of text.replace(/\s+/g, '')) {
    const direction = LETTERS[ch.toLowerCase()];
    if (!direction) throw new Error(`Invalid solution character ${JSON.stringify(ch)}.`);
    steps.push({ direction, expectPush: ch !== ch.toLowerCase() });
  }
  return steps;
}

export type ReplayResult =
  | { readonly ok: true; readonly game: Game; readonly solved: boolean }
  | { readonly ok: false; readonly stepIndex: number; readonly message: string; readonly game: Game };

/**
 * Replay a solution through the real engine. Fails on the first step that is
 * blocked or whose walk/push kind does not match its letter case.
 */
export function replaySolution(level: Level, text: string): ReplayResult {
  let game = createGame(level);
  let solved = false;
  const steps = parseSolution(text);
  for (const [stepIndex, s] of steps.entries()) {
    const result = tryMove(game, s.direction);
    if (result.kind === 'blocked') {
      return { ok: false, stepIndex, message: `Step ${stepIndex} (${s.direction}) blocked by ${result.reason}.`, game };
    }
    if ((result.kind === 'pushed') !== s.expectPush) {
      return {
        ok: false,
        stepIndex,
        message: `Step ${stepIndex} (${s.direction}) was a ${result.kind}, but the notation says ${s.expectPush ? 'push' : 'walk'}.`,
        game,
      };
    }
    game = result.game;
    solved = result.solved;
  }
  return { ok: true, game, solved };
}

const DIRECTION_LETTER: Readonly<Record<string, string>> = {
  '0,-1': 'u',
  '0,1': 'd',
  '-1,0': 'l',
  '1,0': 'r',
};

/**
 * The LURD notation of the moves that led from the level start to the
 * current state, derived from the undo history (no extra bookkeeping).
 * Replaying it with replaySolution() rebuilds the same state AND history,
 * which is how save data resumes a run, including its undo stack.
 */
export function notationOf(game: Game): string {
  const states = [...game.history, game.state];
  let out = '';
  for (let i = 1; i < states.length; i++) {
    const a = states[i - 1]!;
    const b = states[i]!;
    const letter = DIRECTION_LETTER[`${b.player.x - a.player.x},${b.player.y - a.player.y}`];
    if (!letter) throw new Error(`History step ${i} is not a single move.`);
    out += b.pushes > a.pushes ? letter.toUpperCase() : letter;
  }
  return out;
}
