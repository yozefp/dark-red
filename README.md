# TEREA Dark Red — prototypy minihier

Funkčné prototypy herných mechaník pre tabletovú aktiváciu.
Statická stránka, žiadny build, žiadne závislosti.

## Spustenie lokálne

Otvor `index.html` v prehliadači. To je všetko.

## Nasadenie

Statický hosting bez konfigurácie — Vercel, Netlify aj Cloudflare Pages
to vezmú tak, ako to je.

```
vercel
```

## Hry

| | Hra | Vstup |
|---|---|---|
| 1 | SPOT THE INTENSITY | ťuknutie, vizuálne rozlišovanie |
| 2 | PUSH THE INTENSITY | držanie a pustenie |
| 3 | MEMORIZE INTENSITY | ťuknutie, pamäť na poradie |
| 4 | DRAW THE INTENSITY | ťahanie prstom po dráhe |
| 5 | RELEASE THE INTENSITY | potiahnutie a pustenie |

Do kampane idú štyri — PUSH, MEMORIZE, DRAW a RELEASE.
SPOT je v prototype ponechaná na porovnanie.

## Nástroj na meranie

V menu dole je **NÁSTROJ · meranie latencie a fps**. Ťukni 12× do rámčeka
a vypíše odozvu vstupu, snímkovanie a z toho odvodený najužší použiteľný
cieľový pás pre hru PUSH.

## Diagnostika v hre DRAW

Počas ťahu beží vpravo dole živý výpis:

```
vzoriek/s  142
fps        58
kreslenie  každý snímok
```

**Prahy, ktoré majú prejsť:**

| | |
|---|---|
| fps počas ťahu | ≥ 50 |
| vzoriek za sekundu | ≥ 60 |
| pokrytie pri pokojnom obtiahnutí, kolo 1 | ≥ 85 % |

## Poznámky k zariadeniam

Primárny cieľ je Android 13+ v Chrome, na šírku.

Na starších iPadoch (pred iOS 13) nie sú Pointer Events — prototyp má
zálohu cez dotykové udalosti, takže sa tam dá otestovať tiež. Apple má
ale výrazne lepšie vzorkovanie dotyku než lacné Android panely, takže
dobrý výsledok na iPade **nie je dôkazom** o cieľovom zariadení.
