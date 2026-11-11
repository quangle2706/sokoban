import { describe, expect, it } from 'vitest';
import { isSolved, parseLevel, parseSolution, replaySolution } from '../src/engine/index.ts';
import { LEVELS } from '../src/levels/levels.ts';
import { SOLUTIONS } from './fixtures/solutions.ts';

function issueCodes(source: string | string[]): string[] {
  const r = parseLevel(source);
  return r.ok ? [] : r.issues.map((i) => i.code);
}

describe('level validation', () => {
  it('parses a valid level with separate terrain and entities', () => {
    const r = parseLevel(['#####', '#@$.#', '#####']);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.level.width).toBe(5);
    expect(r.level.height).toBe(3);
    expect(r.level.initialPlayer).toEqual({ x: 1, y: 1 });
    expect(r.level.initialCrates).toEqual([{ x: 2, y: 1 }]);
    // The player and crate cells are floor in the terrain layer.
    expect(r.level.terrain.slice(5, 10)).toEqual(['wall', 'floor', 'floor', 'goal', 'wall']);
  });

  it('accepts + and * (player/crate on goal)', () => {
    const r = parseLevel(['#######', '#+*$ .#', '#  $  #', '#######']);
    expect(r.ok).toBe(true);
  });

  it('accepts a newline-separated string and ignores blank edge lines', () => {
    expect(parseLevel('\n#####\n#@$.#\n#####\n').ok).toBe(true);
  });

  it('pads ragged rows with void, never floor', () => {
    const r = parseLevel(['#####', '#@$.#', '####']);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.level.terrain[2 * 5 + 4]).toBe('void');
  });

  it('rejects a level whose floor leaks through a missing cell', () => {
    // Row 1 is short: the floor at (3,1) touches the void beyond it.
    expect(issueCodes(['#####', '#@$.', '#####'])).toContain('not-enclosed');
    expect(issueCodes(['#@$.#'])).toContain('not-enclosed');
  });

  it('rejects an empty level', () => {
    expect(issueCodes('')).toEqual(['empty']);
    expect(issueCodes(['   ', ''])).toEqual(['empty']);
  });

  it('rejects unsupported symbols with their position', () => {
    const r = parseLevel(['#####', '#@$X.#', '######']);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    const issue = r.issues.find((i) => i.code === 'unsupported-symbol');
    expect(issue?.position).toEqual({ x: 3, y: 1 });
  });

  it('requires exactly one player', () => {
    expect(issueCodes(['#####', '# $.#', '#####'])).toContain('player-count');
    expect(issueCodes(['######', '#@@$.#', '######'])).toContain('player-count');
  });

  it('requires at least one crate', () => {
    expect(issueCodes(['####', '#@ #', '####'])).toContain('no-crates');
  });

  it('requires equal numbers of crates and goals', () => {
    expect(issueCodes(['######', '#@$$.#', '######'])).toContain('crate-goal-mismatch');
    expect(issueCodes(['######', '#@$..#', '######'])).toContain('crate-goal-mismatch');
  });

  it('rejects crates or goals outside the playable area', () => {
    const codes = issueCodes([
      '#####  ',
      '#@$.# $',
      '#####. ',
    ]);
    // The outside crate/goal sit in unreachable floor beyond the walls.
    expect(codes).toContain('entity-outside-board');
  });

  it('rejects oversized maps', () => {
    expect(issueCodes(['#'.repeat(65)])).toContain('too-large');
  });
});

describe('solution notation', () => {
  it('parses LURD with push markers and ignores whitespace', () => {
    expect(parseSolution('uR d\nL')).toEqual([
      { direction: 'up', expectPush: false },
      { direction: 'right', expectPush: true },
      { direction: 'down', expectPush: false },
      { direction: 'left', expectPush: true },
    ]);
    expect(() => parseSolution('ux')).toThrow();
  });
});

describe('bundled levels', () => {
  it('has unique ids', () => {
    const ids = LEVELS.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  for (const def of LEVELS) {
    describe(def.id, () => {
      it('passes structural validation', () => {
        const r = parseLevel(def.map);
        expect(r.ok ? [] : r.issues.map((i) => i.message)).toEqual([]);
      });

      it('is not already solved at the start', () => {
        const r = parseLevel(def.map);
        if (!r.ok) throw new Error('invalid');
        expect(isSolved(r.level, { player: r.level.initialPlayer, crates: r.level.initialCrates, moves: 0, pushes: 0 })).toBe(false);
      });

      it('is solved by replaying the author solution', () => {
        const solution = SOLUTIONS[def.id];
        expect(solution, 'missing author solution').toBeDefined();
        if (!solution) return;
        const r = parseLevel(def.map);
        if (!r.ok) throw new Error('invalid');

        const replay = replaySolution(r.level, solution.moves);
        expect(replay.ok ? 'ok' : replay.message).toBe('ok');
        if (!replay.ok) return;
        expect(replay.solved).toBe(true);

        // Counters match the notation: every letter is a move, capitals are pushes.
        const steps = parseSolution(solution.moves);
        expect(replay.game.state.moves).toBe(steps.length);
        expect(replay.game.state.pushes).toBe(steps.filter((s) => s.expectPush).length);
      });
    });
  }
});
