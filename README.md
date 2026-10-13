# TEREA DARK RED — tabletové minihry

Webová aplikácia pre 18 tabletov v predajniach. Zákazník dostane od obsluhy
týždenný kód, zadá ho na tablete a odohrá jednu z hier. Aplikácia nezbiera
žiadne údaje, neposiela e-maily a nemá backend — kto smie hrať, rieši obsluha
vo vlastnom systéme klienta.

Kampaň: teaser 18. 11. 2026, launch 25. 11. 2026, koniec 31. 12. 2026.

## Rýchly štart

```bash
npm install
npm run dev          # http://localhost:5173 — a z tabletu na tej istej sieti
npm test             # jednotkové testy bodovania
npm run e2e          # E2E vo WebKite (iPad) aj Chromiu (android tablet)
npm run shots        # PNG každej obrazovky, bez tabletu
npm run build        # do dist/
```

E2E si server spustí sám. `npm run shots` potrebuje bežiaci `npm run dev`.

## Štyri hry

| id | názov | čo hráč robí |
|---|---|---|
| `draw` | DRAW | prstom obkreslí obrys loga, bez zdvihnutia |
| `push` | PUSH | drží prst, prerazí strop na 100 % a pustí na 110 |
| `memorize` | MEMORIZE | zopakuje poradie, v ktorom sa rozsvietili lupene |
| `release` | RELEASE | tri hody na terč, potiahne a pustí |

Hru beží vždy len jedna — ktorá, určuje konfigurácia.

## Ako je to poskladané

```
src/core/      stavový automat, konfigurácia, vstup, nečinnosť
src/games/     štyri hry + spoločná kostra (shell.ts)
src/ui/        obrazovky, komponenty, texty, dizajnové tokeny
src/debug/     ladiaci panel, sondy, generátor ťahov
src/panel/     konfigurácia kampane (samostatná stránka)
```

Dve veci, na ktorých stojí zvyšok:

**Bodovanie je čistá funkcia.** Každá hra má modul bez DOM, ktorý zo vstupu
spočíta výsledok. Vykresľovanie je oddelené, takže keď zaostane, na výsledok
to nemá vplyv — a obtiažnosť sa dá ladiť testom, nie hraním.

**Hra vidí len `GameModule`.** Shell nevie, čo je vnútri:

```ts
interface GameModule {
  id: GameId;
  mount(root: HTMLElement, cfg: RoundConfig): void;
  onRoundEnd?: (r: RoundResult) => void;
  destroy(): void;
}
```

Nová hra je nový priečinok v `src/games/` a jeden riadok v `GAMES` v `App.vue`.

## Konfigurácia

`public/config.json` nesie rozvrh celej kampane. Tablet si týždeň vyberie
podľa dátumu, takže sa nasadí raz a potom sa do toho netreba hrabať:

```json
{
  "difficulty": "standard",
  "rounds": 3,
  "schedule": [
    { "from": "2026-11-18", "code": "472013", "game": "draw" },
    { "from": "2026-11-25", "code": "318594", "game": "push" }
  ]
}
```

Platí posledný záznam, ktorý už začal. Kým kampaň nezačala, platí prvý —
hodiny tabletu teda nerozhodujú o tom, či sa dá hrať, len o tom, ktorý
týždeň beží. Súbor vyrobí **`/panel.html`**, vrátane kódov a rotácie hier.

Kódy v `config.json` sú čitateľné pre každého, kto si otvorí `/config.json`.
Je to brána pre obsluhu, nie tajomstvo.

## Ladenie na tablete

Adresa s `?debug=1` zapne ladiaci panel (ozubené koliesko vpravo dole):
prepínanie obrazovky, hry, obtiažnosti a kôl, posuvníky tolerancie a hranice,
prehrávanie ťahov a záznam skutočných dotykov do JSON-u.

Bez `?debug=1` nie je panel dostupný a lokálne prebitie konfigurácie neplatí —
zabudnuté nastavenie teda nemôže ovplyvniť tablet v predajni.

Záznam z tabletu (`kopíruj JSON` v paneli) sa dá prehrať cez
`__tdr.replay(...)` a doladiť tolerancie proti skutočnému prstu.

## Nasadenie

Cloudflare Pages, napojené na tento repozitár:

- build command: `npm run build`
- output directory: `dist`
- žiadne premenné prostredia

`public/_headers` drží `config.json` a `sw.js` mimo vyrovnávacej pamäte
a hashované súbory v nej napevno.

Service worker sa registruje len v zostavenej verzii. Zoznam súborov do neho
dopĺňa build (`tools/gen-sw.mjs`), pretože mená nesú hash: pri prvej návšteve
service worker ešte nebeží, takže by si ich sám nezachytil a tablet by pri
výpadku wifi ukázal prázdnu stránku.

## Tablety

Natívna aplikácia nie je — ide o web, takže cez Business App Store netreba
nič schvaľovať. Na mieste treba:

- otvoriť adresu v prehliadači a pridať na plochu,
- zapnúť **Guided Access** (iPad) alebo **pripnutie obrazovky** (Android),
- zamknúť orientáciu na šírku, vypnúť automatické uspávanie,
- nechať jas na maxime a tablet v nabíjačke.

Na iPade zostane hore systémový pruh s hodinami a batériou — pri webovej
aplikácii sa skryť nedá.

## Čo ešte nie je doladené

Tolerancie v DRAW a šírka pásma v PUSH sú nastavené proti syntetickým ťahom.
Kým nevieme model tabletu a verziu systému, nedajú sa potvrdiť — digitizéry
sa líšia vzorkovaním aj presnosťou. Po dodaní zariadení treba odohrať každú
hru na mieste, zobrať záznam z ladiaceho panela a hodnoty potvrdiť.
