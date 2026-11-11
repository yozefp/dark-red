import { describe, it, expect } from 'vitest';
import { shouldReload, QUIET_MS } from '../../src/core/update';

describe('obnovenie na diaľku', () => {
  const ok = { pending: true, screen: 'attract', sinceInputMs: QUIET_MS };

  it('obnoví sa na úvode po tichu, keď je čo aktualizovať', () => {
    expect(shouldReload(ok)).toBe(true);
  });

  it('bez novej verzie sa neobnoví', () => {
    expect(shouldReload({ ...ok, pending: false })).toBe(false);
  });

  it('počas hry, kódu, tutoriálu ani výsledku nikdy', () => {
    for (const screen of ['code', 'tutorial', 'playing', 'result']) {
      expect(shouldReload({ ...ok, screen, sinceInputMs: 10 * QUIET_MS })).toBe(false);
    }
  });

  it('krátko po dotyku nie', () => {
    expect(shouldReload({ ...ok, sinceInputMs: QUIET_MS - 1 })).toBe(false);
  });
});
