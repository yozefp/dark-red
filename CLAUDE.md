# TEREA DARK RED — kontext pre pokračovanie

Webová aplikácia so štyrmi minihrami pre 18 tabletov v predajniach.
Rozsah práce, obmedzenia a stav zariadení sú v pamäti projektu.
Architektúra, spustenie a nasadenie sú v `README.md`.

Píš po slovensky. Odhady drž triezve, rozsah nerozširuj.

## Stav

Funkčne hotové a otestované: celý priebeh (attract → kód → tutoriál → hra →
výsledok), štyri hry, ladiaci panel, konfiguračný panel, offline vrstva.
48 jednotkových a 36 E2E testov (WebKit + Chromium) prechádza.

## Čo sa rieši teraz

**Hry nevyzerajú ako schválené obrazovky.** Schválené obrazovky sú
`../ref-obrazovky/` (8 ks, hlavné) a `../ref-doplnkove/` (14 ks, výsledkovky
a stavy; prehľad v `sheet.png`).

Hlavná príčina bola **typografická mierka** — všetko bolo zhruba o polovicu
menšie, než má byť. Obrazovky z dizajnu sú 2000 px široké a veľkosti v nich
sú proporčné: nadpis na úvodnej má výšku verzálky 7,6 % šírky obrazovky,
telo textu 2 %. V kóde boli pevné pixely so stropom okolo 46 px.
Opravené v `src/ui/style.css` — mierka je teraz vo `vw` premenných na
`:root` (`--fs-hero`, `--fs-h1`, `--fs-body`, `--gut`, …). Pri ďalšom
ladení meniť tie premenné, nie veľkosti po komponentoch.

Čo ostáva dotiahnuť, od najväčšieho:

1. **Výsledkové obrazovky nemajú vizuál hry.** V dizajne je každá iná a celá
   obrazovka je kompozícia: DRAW má veľký rozžiarený obrys a text `ČISTÁ LINKA`
   / `94 %` **vnútri** tvaru; PUSH zamrznutý meter vľavo a `PRETLAK` / `110 %`
   vpravo; MEMORIZE rozsvietený kvet nad textom `V PORADÍ`; RELEASE terč s
   troma zásahmi a `PRESNE` / `4` / `mm` / `OD STREDU`.
   `Result.vue` má na to nevyužitý slot `sideVisual`, `App.vue` ho nenapĺňa.

2. **MEMORIZE má zlé usporiadanie lupeňov.** V dizajne je to **lotos —
   prekrývajúce sa lupene vejárom**, nie kríž zo štyroch samostatných listov,
   ako je to teraz v `src/games/memorize/geometry.ts`.
   Pozor: súčasný tvar je zámerne neprekrývajúci sa, aby bolo jednoznačné,
   do ktorého lupeňa hráč ťukol (overuje to test). Pri prekrytí treba
   zásah riešiť inak — napríklad poradím vykresľovania zhora nadol.

3. **Prehra v MEMORIZE** má v dizajne vlastnú obrazovku s popiskami
   `TVOJ VÝBER` a `TÁTO BOLA NA RADE` — ukazuje, kde sa hráč pomýlil.

4. **Nadpis na obrazovke s kódom sa láme do troch riadkov**, v dizajne sú dva.

Postup: `npm run shots` spraví PNG všetkých obrazoviek a tie sa porovnávajú
s referenciami jednu po druhej. Tutoriál a hry treba nasnímať zvlášť cez
`/test.html`.

## Čo zostáva mimo toho

- Nasadenie na Cloudflare Pages (treba účet klienta/agentúry)
- Potvrdenie tolerancií na cieľových tabletoch — model stále nevieme
- Kódy v `public/config.json` sú vygenerované, treba ich potvrdiť s klientom
