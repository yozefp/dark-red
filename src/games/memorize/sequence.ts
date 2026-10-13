/**
 * Logika hry MEMORIZE. Čistá — bez DOM aj bez náhody zvonku,
 * takže sa dá testovať a priebeh sa dá zopakovať.
 */

export const PETALS = 4;

/** Dĺžka poradia po kolách. */
export const DIFFICULTY: Record<string, number[]> = {
  easy:     [3, 4, 5],
  standard: [4, 5, 6],
  hard:     [5, 6, 7],
};

export interface MemoConfig {
  /** koľko zábleskov treba zapamätať */
  length: number;
  /** ako dlho svieti jeden lupeň, ms */
  flashMs: number;
  /** pauza medzi zábleskami, ms */
  gapMs: number;
}

export function configFor(difficulty: string, round: number): MemoConfig {
  const lens = DIFFICULTY[difficulty] ?? DIFFICULTY.standard;
  const length = lens[Math.min(round, lens.length) - 1];
  // s dlhším poradím sa tempo mierne zrýchľuje, inak sa kolo vlečie
  return { length, flashMs: Math.max(300, 520 - (length - 3) * 40), gapMs: 170 };
}

/**
 * Dva rovnaké lupne za sebou sa na obrazovke nedajú odlíšiť od jedného
 * dlhšieho záblesku, preto sa opakovanie nikdy nevygeneruje.
 */
export function makeSequence(length: number, rnd: () => number): number[] {
  const out: number[] = [];
  for (let i = 0; i < length; i++) {
    let next = Math.floor(rnd() * PETALS) % PETALS;
    if (i > 0 && next === out[i - 1]) next = (next + 1 + Math.floor(rnd() * (PETALS - 1))) % PETALS;
    out.push(next);
  }
  return out;
}

export interface MemoJudgement {
  /** koľko krokov je zatiaľ správne */
  correct: number;
  /** posledné ťuknutie bolo mimo */
  failed: boolean;
  /** celé poradie je zopakované */
  done: boolean;
  /** 0..1 pre výsledkovú obrazovku */
  score: number;
}

export function judge(expected: number[], got: number[]): MemoJudgement {
  let correct = 0;
  while (correct < got.length && got[correct] === expected[correct]) correct++;
  const failed = correct < got.length;
  const done = !failed && got.length === expected.length;
  return { correct, failed, done, score: correct / expected.length };
}

/** Deterministický generátor — rovnaké semienko dá rovnaké poradie. */
export function seeded(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}
