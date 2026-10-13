/**
 * Vyrobí PNG každej obrazovky bez tabletu — na rýchlu vizuálnu kontrolu
 * po zmene štýlov. Beží vo WebKite, teda v tom istom jadre ako Safari na iPade.
 *
 *   npm run dev            (v druhom okne)
 *   npm run shots
 */
import { webkit } from '@playwright/test';
import { mkdirSync, readFileSync } from 'node:fs';

const OUT = process.argv[2] ?? 'shots';
const URL_BASE = process.env.SHOTS_URL ?? 'http://localhost:5173';
const cfg = JSON.parse(readFileSync(new URL('../public/config.json', import.meta.url), 'utf-8'));

mkdirSync(OUT, { recursive: true });
const browser = await webkit.launch();
const page = await browser.newPage({ viewport: { width: 1194, height: 834 }, hasTouch: true });
const shot = (n) => page.screenshot({ path: `${OUT}/${n}.png` });

await page.addInitScript(() => localStorage.setItem('tdr.override', JSON.stringify({ rounds: 1 })));
await page.goto(`${URL_BASE}/?debug=1`);

await page.waitForSelector('[data-t="attract"]');
await shot('1-attract');

await page.locator('[data-t="attract"]').click();
await page.waitForSelector('[data-t="code"]');
for (const d of String(cfg.code).slice(0, 3)) await page.locator(`[data-t="key-${d}"]`).click();
await shot('2-kod');

for (const d of String(cfg.code).slice(3)) await page.locator(`[data-t="key-${d}"]`).click();
await page.waitForSelector('[data-t="tutorial"]');
await shot('3-tutorial');

await page.locator('[data-t="start"]').click();
await page.waitForFunction(() => window.__tdr?.probe?.path?.length > 0);
await shot('4-hra-start');

await page.evaluate(() => {
  const a = window.__tdr;
  a.replay(a.trace(a.probe.path, { to: 0.62, wobble: 9 }));
});
await page.waitForTimeout(250);
await shot('5-hra-priebeh');

await page.waitForSelector('[data-t="result"]');
await shot('6-vysledok');

await browser.close();
console.log(`hotovo → ${OUT}/`);
