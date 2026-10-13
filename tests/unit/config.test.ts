import { describe, it, expect } from 'vitest';
import { parseConfig, pickEntry, today, FALLBACK } from '@/core/config';

describe('konfigurácia', () => {
  it('plochý objekt sa prečíta ako doteraz', () => {
    const c = parseConfig({ week: '2026-11-25', code: '472013', game: 'push', rounds: 2 });
    expect(c.code).toBe('472013');
    expect(c.game).toBe('push');
    expect(c.rounds).toBe(2);
  });

  it('nezmysly nahradí zabudovanými hodnotami', () => {
    const c = parseConfig({ code: 'abc', game: 'niet', rounds: 99 });
    expect(c.code).toBe(FALLBACK.code);
    expect(c.game).toBe(FALLBACK.game);
    expect(c.rounds).toBe(5);
  });

  it('z rozvrhu vyberie týždeň, ktorý už začal', () => {
    const file = {
      rounds: 3,
      schedule: [
        { from: '2026-11-18', code: '111111', game: 'draw' },
        { from: '2026-11-25', code: '222222', game: 'push' },
        { from: '2026-12-02', code: '333333', game: 'memorize' },
      ],
    };
    expect(parseConfig(file, '2026-11-27').code).toBe('222222');
    expect(parseConfig(file, '2026-11-27').game).toBe('push');
    expect(parseConfig(file, '2026-12-02').code).toBe('333333');
    expect(parseConfig(file, '2027-03-01').code).toBe('333333');
  });

  it('pred začiatkom kampane platí prvý týždeň', () => {
    const file = { schedule: [{ from: '2026-11-18', code: '111111' }] };
    expect(parseConfig(file, '2026-01-01').code).toBe('111111');
  });

  it('spoločný základ platí pre všetky týždne a týždeň ho môže prebiť', () => {
    const file = {
      difficulty: 'hard', rounds: 2,
      schedule: [{ from: '2026-11-18', code: '111111' },
                 { from: '2026-11-25', code: '222222', rounds: 1 }],
    };
    expect(parseConfig(file, '2026-11-20').difficulty).toBe('hard');
    expect(parseConfig(file, '2026-11-20').rounds).toBe(2);
    expect(parseConfig(file, '2026-11-26').rounds).toBe(1);
  });

  it('neusporiadaný alebo pokazený rozvrh nič nezhodí', () => {
    const file = {
      schedule: [
        { from: '2026-12-02', code: '333333' },
        { from: 'nezmysel', code: '999999' },
        { from: '2026-11-18', code: '111111' },
      ],
    };
    expect(parseConfig(file, '2026-11-20').code).toBe('111111');
    expect(parseConfig({ schedule: [] }, '2026-11-20').code).toBe(FALLBACK.code);
  });

  it('bez vlastného označenia sa týždeň pomenuje dátumom začiatku', () => {
    const file = { schedule: [{ from: '2026-11-25', code: '222222' }] };
    expect(parseConfig(file, '2026-11-26').week).toBe('2026-11-25');
  });

  it('dnešok je v miestnom čase, nie v UTC', () => {
    expect(today(new Date(2026, 10, 25, 23, 30))).toBe('2026-11-25');
    expect(pickEntry([{ from: '2026-11-25' }], '2026-11-25')?.from).toBe('2026-11-25');
  });
});
