# TEREA DARK RED — kontext pre pokračovanie

Webová aplikácia so štyrmi minihrami pre 18 tabletov v predajniach.
Rozsah práce, obmedzenia a stav zariadení sú v pamäti projektu.
Architektúra, spustenie a nasadenie sú v `README.md`.

Píš po slovensky. Odhady drž triezve, rozsah nerozširuj.

## Stav

Funkčne hotové a otestované: celý priebeh (attract → kód → tutoriál → hra →
výsledok), štyri hry, ladiaci panel, konfiguračný panel, offline vrstva.
54 jednotkových a 42 E2E testov (WebKit + Chromium) prechádza.

Lokálne: `npm run dev`, potom `http://localhost:5173/?debug=1&nocode=1`.
Rozcestník všetkých hier je `http://localhost:5173/test.html`.

## Hotové opravy (neriešiť znova)

- **Typografická mierka.** Všetko bolo o polovicu menšie, než má byť.
  Obrazovky z dizajnu sú 2000 px široké a veľkosti v nich sú proporčné
  (nadpis = 7,6 % šírky, telo 2 %). Mierka je teraz vo `vw` premenných na
  `:root` v `src/ui/style.css` (`--fs-hero`, `--fs-h1`, `--fs-body`, `--gut`).
  Pri ďalšom ladení meniť **tie premenné**, nie veľkosti po komponentoch.
- **MEMORIZE je prekreslený z dizajnérskeho exportu.** Krivka lupeňa,
  rotácie (`ANGLES`), pivot aj dĺžka sú odpísané zo SVG v `../ref-export/`,
  nie odhadnuté od oka. Geometria je `src/games/memorize/geometry.ts`,
  kreslenie `draw.ts` (zdieľa ho hra, ukážka v tutoriáli aj výsledkovka).
- **Odpoveď na krok je veľkým nad kvetom** (`.memo__flash`, SPRÁVNE / CHYBA).
  Bodky v stavovom riadku ostali, ale nie sú hlavná spätná väzba — hráč sa
  pozerá na lupene.
- **Výsledkovky majú vizuál hry.** Podklad posiela každá hra v
  `RoundResult.visual`.
- **Vstup sleduje len prvý prst** — položená dlaň už neprerušuje ťah
  (`src/core/input.ts`).
- **Tolerancia DRAW** zvýšená (`DIFFICULTY` v `src/games/draw/scoring.ts`),
  prvé kolo je ľahké. Overené maticou v jednotkových testoch.
- **Pruh SILA v RELEASE.** Strop ťahu sa odvodzuje od vzdialenosti terča
  (`maxPullFor`), nie z pevného čísla — pevné číslo bolo na vyšších
  displejoch nedosiahnuteľné.
- **Nadpis na obrazovke s kódom** sa už láme do dvoch riadkov ako v dizajne.

## Čo ostáva

1. Drobnosti v kóde (navrhnuté, Jozef sa k nim ešte nevyjadril):
   `onRoundEnd` v `App.vue` má nezrušený `setTimeout`; výsledkovka má dva
   odpočty naraz (`Result.vue` aj `idle.ts`); `scheduleReturn` v `idle.ts`
   je mŕtvy kód.
2. DRAW, PUSH a RELEASE sú postavené na statických PNG referenciách, čiže na
   tom istom odhade, ktorý pri MEMORIZE nefungoval. Ak prídu HTML/SVG
   exporty, prekresliť ich rovnako ako MEMORIZE.
3. Nasadenie na Cloudflare Pages (treba účet klienta/agentúry).
4. Potvrdenie tolerancií na cieľových tabletoch — model stále nevieme.
5. Kódy v `public/config.json` sú vygenerované, treba ich potvrdiť s klientom.
6. Znenie `MIMO PORADIA` je zmenené len v kóde; na vykreslených dizajnových
   obrazovkách je ešte staré `STRATIL SI TO`. Ak to klientovi prekáža, treba
   obrazovky prekresliť.

## Poučenie z tejto práce

Vizuál sa neladí od oka. Keď niečo „nevyzerá ako dizajn", zmerať to
číselne (napr. dĺžka lupeňa ako % výšky obrazovky) alebo si vyžiadať
export. Dva pokusy odhadom pri MEMORIZE skončili tak, že to bolo horšie.
