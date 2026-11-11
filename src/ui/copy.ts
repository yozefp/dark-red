/** Všetky texty na jednom mieste.
 *  Zmena vety na výsledkovke = jeden riadok, nie osem komponentov.
 *
 *  Wording dodal klient (DarkRed_wording_hry.xlsx, 9. 11. 2026). Veľké
 *  písmená v nadpisoch, tlačidlách a hláškach robí CSS, nie tento súbor.
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
    headline: 'Objav, čo sa skrýva za dverami',
    body: 'Zapoj sa do súťaže o IQOS ILUMA i',
    body2: 'a balenia TEREA ',
    body3: 'DARK RED',
    cta: 'Dotykom spusti hru',
    note: 'Každý týždeň ťa čaká nová hra',
  },

  code: {
    headline: 'Zadaj kód hry',
    hint: 'Obsluha ti dá nápovedu, kde ho nájdeš.',
    wrong: 'Ups. Neplatný kód. Skús to znova.',
  },

  games: {
    draw: {
      headline: 'Nakresli intenzitu jedným ťahom',
      rule: 'Zvládneš to bez zdvihnutia prsta trikrát za sebou?',
      cta: 'Spustiť hru',
      status: 'Úspešnosť',
      /** pred ťahom */
      hint: 'Prilož prst na bod a obkresli tvar',
      /** ťah začal mimo štartu */
      hintStart: 'Tvoj štart je pri vyznačenom bode',
      roundWin: 'Presný ťah',
      roundLose: 'Mimo línie',
    },
    push: {
      headline: 'Dotiahni to na 110 %',
      rule: 'Podrž prst, kým nedosiahneš 110 %. Trafíš to trikrát za sebou?',
      cta: 'Spustiť hru',
      status: 'TVOJ DRIVE',
      /** pred stlačením */
      hint: 'Prilož prst a zdvihni ho, keď budeš na 110 %.',
      /** počas držania */
      hintHold: 'Naberá to na intenzite. Pusti na 110 %.',
      /** po prerazení stovky — vo wordingu chýba, zladené s ostatnými */
      hintOver: 'Strop prerazený. Pusti na 110 %.',
      roundWin: 'PRESNE',
      /** pustenie nad pásmom alebo meter došiel na 120 */
      roundLate: 'PRÍLIŠ NESKORO',
      lateHint: 'Príliš neskoro. Už si v oblakoch.',
      /** pustenie pod pásmom */
      roundEarly: 'PRÍLIŠ SKORO',
      earlyHint: 'Príliš skoro. Mieri až na 110 %.',
      /** značka na metri pri 120 — tam kolo skončí samo */
      stop: 'KONIEC',
    },
    memorize: {
      headline: 'Zapamätaj si svetelnú kombináciu',
      rule: 'Najprv sleduj a potom zopakuj. Zvládneš tri kolá?',
      cta: 'Spustiť hru',
      /** počas ukážky */
      hintWatch: 'Sleduj poradie, potom ho zopakuj.',
      /** keď je hráč na rade */
      hint: 'Ťukni na lupene v tom istom poradí.',
      watch: 'Najprv sleduj',
      yourTurn: 'Teraz si na rade',
      /** veľká odpoveď nad kvetom, raz za kolo */
      flashOk: 'Výborne',
      flashBad: 'Chyba',
      roundWin: 'Skvelý postreh!',
      roundLose: 'Nesprávne poradie',
    },
    release: {
      headline: 'Otestuj svoju mušku',
      rule: 'Natiahni, namier na terč a pusti. Kľúčová je správna intenzita sily. Trafíš stred trikrát?',
      cta: 'Spustiť hru',
      hint: 'Potiahni od krúžku smerom k sebe, namier na terč a pusti.',
      power: 'SILA',
      roundWin: 'Zásah do stredu!',
      roundLose: 'Tesne vedľa',
      /** všetky hody mimo terča — „tesne vedľa“ by vtedy klamalo */
      roundOff: 'Mimo terča',
      /** krátky tvar do výsledku kola („TESNE VEDĽA — mimo terča") */
      offTarget: 'mimo terča',
      /** hláška po hode mimo terča, ešte sú ďalšie hody */
      offTargetHint: 'Ups. To šlo mimo terča.',
      allOff: 'Všetky pokusy boli mimo terča.',
    },
  },

  result: {
    // o cenách appka nehovorí — mechanika je mimo nej a môže sa meniť.
    // Appka ani nestráži počet pokusov, takže nesľubuje „jeden denne".
    win: 'Yes! Máš to.',
    lose: 'Tentokrát ti to nevyšlo.',
    winBody: 'Ukáž svoje skóre obsluhe',
    loseBody: 'Chceš to skúsiť znovu? O ďalší pokus požiadaj obsluhu.',
  },

  misc: {
    round: (a: number, b: number) => `KOLO ${a} / ${b}`,
    /** 1 krok, 2–4 kroky, 5+ krokov */
    steps: (n: number) => `${n} ${n === 1 ? 'krok' : n < 5 ? 'kroky' : 'krokov'}`,
  },
} as const;
