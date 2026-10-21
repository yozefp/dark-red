# TEREA DARK RED — kontext pre pokračovanie

Webová aplikácia so štyrmi minihrami pre 18 tabletov v predajniach.
Rozsah práce, obmedzenia a stav zariadení sú v pamäti projektu.
Architektúra, spustenie a nasadenie sú v `README.md`.

Píš po slovensky. Odhady drž triezve, rozsah nerozširuj.

## Stav

Funkčne hotové a otestované: celý priebeh (attract → kód → tutoriál → hra →
výsledok), štyri hry, ladiaci panel, konfiguračný panel, offline vrstva.
56 jednotkových a 42 E2E testov (WebKit + Chromium) prechádza.

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
- **DRAW je prekreslený z exportu** (`../ref-export/Trace-v-polovici.dc.html`).
  Obrys je rovnostranný trojuholník so zaoblenými rohmi (`TRACE` v
  `src/games/draw/geometry.ts`), štart v ľavom dolnom rohu, ťah hore.
  Farby a hrúbky sú v `TRACE_STYLE` v `render.ts`; ten zdieľa hra, ukážka
  aj výsledkovka. Iskry sú preč, v dizajne nie sú. Export má staršiu
  paletu (#16080C, #FFB627) a PRESNOSŤ vpravo hore namiesto KOLA — hlavička
  a stavový riadok ostali spoločné so zvyškom aplikácie.
- **Odpoveď na kolo je veľkým v ploche hry, vo všetkých hrách**
  (`shell.flash()`, `.g__flash`). MEMORIZE nad kvetom (SPRÁVNE / CHYBA),
  DRAW v trojuholníku, PUSH nad číslom, RELEASE medzi terčom a krúžkom.
  Riadok s nápovedou dole bol príliš nenápadný. Bodky v stavovom riadku
  MEMORIZE ostali, ale nie sú hlavná spätná väzba.
- **PUSH stále zrýchľuje** (Jozef, 20. 10.): začne na 12 %/s a nikde
  nebrzdí, ani pri 100, ani pri 110. Výherné pásmo je napevno 105–115
  (`BAND`), kolá sa líšia len rýchlosťou pri 110 (`DIFFICULTY` 25/34/48
  na štandarde) — v pásme je meter 0,40 / 0,29 / 0,21 s. Texty PRESNE / PRÍLIŠ SKORO / PRÍLIŠ NESKORO,
  značka KONIEC pri 120 (PRETLAK a PREPÁLENÉ hráč nechápal).
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
2. PUSH a RELEASE sú postavené na statických PNG referenciách, čiže na
   tom istom odhade, ktorý pri MEMORIZE nefungoval. Ak prídu HTML/SVG
   exporty, prekresliť ich rovnako ako MEMORIZE a DRAW. Terč v RELEASE
   ešte kreslí starý tvar loga (`samplePath`).
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
