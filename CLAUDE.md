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

Hotové od tej opravy:

- **Výsledkovky majú vizuál hry.** Rozloženie sa odvodzuje od hry: obrys
  DRAW má text vo vnútri, kvet MEMORIZE nad ním, meter PUSH aj terč RELEASE
  vedľa neho. Podklad posiela každá hra v `RoundResult.visual`.
- **MEMORIZE je lotos** s prekrývajúcimi sa lupeňmi; o zásahu rozhoduje
  poradie vykresľovania (hráč trafí to, čo vidí).
- **Vstup sleduje len prvý prst** — položená dlaň už neprerušuje ťah.

Čo ostáva dotiahnuť:

1. **Tretie kolo DRAW je prakticky nevyhrateľné.** Vyžaduje priemernú
   odchýlku pod ~10 px po celej dráhe, bežný človek prstom má 15–25 px.
   Tolerancia v `src/games/draw/scoring.ts` by mala ísť z 12 na 15–16.

2. **Pruh SILA v RELEASE sa pri správnom hode zastaví na 43 %.** Vyzerá to,
   akoby hráč ťahal slabo, hoci trafil. `maxPull` zo 190 na ~125.

3. **Prvá prehra ukončí celú hru.** Zvážiť jeden opravný pokus v prvom kole —
   dizajnový zámer bol, že prvé kolo vyhrá takmer každý.

4. **Nadpis na obrazovke s kódom sa láme do troch riadkov**, v dizajne sú dva.

5. Drobnosti: `onRoundEnd` v `App.vue` má nezrušený `setTimeout`;
   výsledkovka má dva odpočty naraz (`Result.vue` aj `idle.ts`);
   `scheduleReturn` v `idle.ts` je mŕtvy kód.

## Čo zostáva mimo toho

- Nasadenie na Cloudflare Pages (treba účet klienta/agentúry)
- Potvrdenie tolerancií na cieľových tabletoch — model stále nevieme
- Kódy v `public/config.json` sú vygenerované, treba ich potvrdiť s klientom
