/** Všetky texty na jednom mieste.
 *  Zmena vety na výsledkovke = jeden riadok, nie osem komponentov.
 *
 *  Dve pravidlá, ktoré tu platia pri každej zmene:
 *
 *  1. ŽIADNY ROD. Hrá to aj žena, takže „vyhral si" ani „spálil si to"
 *     nejde. Minulý čas sa v slovenčine ohýba podľa rodu — preto sú tu
 *     prítomné časy a neosobné tvary („pustenie prišlo neskoro").
 *  2. HLÁŠKA KOLA ≠ NADPIS VÝSLEDKU. `roundWin` je komentár k jednému
 *     kolu priamo v hre, kde za ním ide číslo („ČISTÁ LINKA — 94 %").
 *     Na výsledkovke sa hráč pýta len „vyhral som?", tam ide `result.win`,
 *     rovnaký pre všetky hry.
 */
export const COPY = {
  brand: { name: 'T E R E A', product: 'DARK RED' },

  attract: {
    headline: 'ČO JE ZA DVERAMI?',
    body: 'Hraj o zariadenie IQOS ILUMA i',
    body2: 'a balenia TEREA ',
    body3: 'DARK RED',
    cta: 'DOTKNI SA A HRAJ',
    note: 'Nová hra každý týždeň',
  },

  code: {
    headline: 'ZADAJ TÝŽDENNÝ KÓD',
    hint: 'Kód ti povie obsluha.',
    wrong: 'Takýto kód neplatí.',
  },

  games: {
    draw: {
      headline: 'NAKRESLI INTENZITU',
      rule: 'Prstom. Bez zdvihnutia.',
      cta: 'ŠTART',
      status: 'PRESNOSŤ',
      roundWin: 'ČISTÁ LINKA',
      roundLose: 'MIMO LINKY',
    },
    push: {
      headline: 'STO PERCENT JE STROP. PRE OSTATNÝCH.',
      rule: 'Drž. Pusť na stodesiatich.',
      cta: 'PRILOŽ PRST',
      roundWin: 'PRESNE',
      /** pustenie nad pásmom alebo meter došiel na 120 */
      roundLate: 'PRÍLIŠ NESKORO',
      /** pustenie pod pásmom */
      roundEarly: 'PRÍLIŠ SKORO',
      /** značka na metri pri 120 — tam kolo skončí samo */
      stop: 'KONIEC',
    },
    memorize: {
      headline: 'ZAPAMÄTAJ SI SVETLO',
      rule: 'Rozsvieti sa. Ty to zopakuješ.',
      cta: 'ŠTART',
      watch: 'SLEDUJ',
      yourTurn: 'TERAZ TY',
      /** veľká odpoveď nad kvetom, raz za kolo */
      flashOk: 'SPRÁVNE',
      flashBad: 'CHYBA',
      roundWin: 'CELÉ PORADIE',
      roundLose: 'ZLÉ PORADIE',
    },
    release: {
      headline: 'TRI HODY. ŽIADNE MIERENIE NADVAKRÁT.',
      rule: 'Potiahni a pusť.',
      cta: 'ŠTART',
      power: 'SILA',
      roundWin: 'DO STREDU',
      roundLose: 'VEDĽA',
    },
  },

  result: {
    // o cenách appka nehovorí — mechanika je mimo nej a môže sa meniť.
    // Appka ani nestráži počet pokusov, takže nesľubuje „jeden denne".
    win: 'MÁŠ TO',
    lose: 'NEVYŠLO TO',
    winBody: 'Ukáž výsledok obsluhe.',
    loseBody: 'O ďalší pokus požiadaj obsluhu.',
  },

  misc: {
    round: (a: number, b: number) => `KOLO ${a} / ${b}`,
    /** 1 krok, 2–4 kroky, 5+ krokov */
    steps: (n: number) => `${n} ${n === 1 ? 'krok' : n < 5 ? 'kroky' : 'krokov'}`,
  },
} as const;
