/** Všetky texty na jednom mieste.
 *  Zmena vety na výsledkovke = jeden riadok, nie osem komponentov. */
export const COPY = {
  brand: { name: 'T E R E A', product: 'DARK RED' },

  attract: {
    headline: 'ČO JE ZA DVERAMI?',
    body: 'Hraj o zariadenie IQOS ILUMA i a balenia TEREA DARK RED.',
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
      win: 'ČISTÁ LINKA',
      lose: 'MIMO LINKY',
    },
    push: {
      headline: 'STO PERCENT JE STROP. PRE OSTATNÝCH.',
      rule: 'Drž. Pusť na stodesiatich.',
      cta: 'PRILOŽ PRST',
      win: 'PRETLAK',
      lose: 'SPÁLIL SI TO',
    },
    memorize: {
      headline: 'ZAPAMÄTAJ SI SVETLO',
      rule: 'Rozsvieti sa. Ty to zopakuješ.',
      cta: 'ŠTART',
      watch: 'SLEDUJ',
      yourTurn: 'TERAZ TY',
      win: 'V PORADÍ',
      lose: 'STRATIL SI TO',
    },
    release: {
      headline: 'TRI HODY. ŽIADNE MIERENIE NADVAKRÁT.',
      rule: 'Potiahni a pusť.',
      cta: 'ŠTART',
      power: 'SILA',
      win: 'PRESNE',
      lose: 'VEDĽA',
    },
  },

  /** TODO potvrdiť s klientom — objavuje sa na ôsmich obrazovkách */
  result: {
    winBody: 'Ukáž výsledok obsluhe.',
    winNote: 'Si v žrebovaní o hlavnú cenu.',
    loseBody: 'Dnes to nevyšlo.',
    loseNote: 'Skús to znova zajtra — jeden pokus denne.',
  },

  misc: {
    otherGame: 'Radšej inú hru',
    round: (a: number, b: number) => `KOLO ${a} / ${b}`,
  },
} as const;
