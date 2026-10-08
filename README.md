# TEREA DARK RED — tabletové hry

Štyri herné mechaniky pre tabletovú aktiváciu v Brand Retail.
Statická aplikácia, bez servera a bez osobných údajov.

## Spustenie

```
npm install
npm run dev        # dostupné aj z tabletu v tej istej sieti
npm run test       # jednotkové testy
npm run build
```

## Architektúra

Návrh a rozhodnutia sú v `ARCHITEKTURA.md` v nadradenom projekte.

```
src/
  core/      stavový automat, konfigurácia, vstup, nečinnosť
  games/     herné mechaniky — každá samostatne testovateľná
  ui/        obrazovky okolo hier
  debug/     vývojový panel, záznam a prehratie vstupu
public/
  config.json   týždenná konfigurácia, mimo buildu
  prototype/    pôvodné prototypy, dostupné na /prototype/
```

### Princíp, na ktorom to stojí

**Skórovanie každej hry je čistá funkcia** — žiadny canvas, žiadny DOM,
žiadny čas. Vstupom je pole vzoriek, výstupom skóre.

Vďaka tomu sa dá testovať bez prehliadača, ladiť na ťahoch zaznamenaných
z reálneho tabletu, a vykresľovanie môže zaostávať bez vplyvu na výsledok.

## Konfigurácia

`public/config.json` — mení sa raz za týždeň, nevyžaduje nový build.

```json
{ "week": "2026-11-25", "code": "472013", "game": "draw",
  "difficulty": "standard", "rounds": 3,
  "idleTimeoutMs": 45000, "resultTimeoutMs": 15000 }
```

Validuje sa pri načítaní. Pri nedostupnosti sa použije posledná známa
z pamäte zariadenia, inak zabudovaná záloha.

## Prototypy

Pôvodné prototypy všetkých piatich mechaník sú na `/prototype/`.
Obsahujú nástroj na meranie latencie a fps.
