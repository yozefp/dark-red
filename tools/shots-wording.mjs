/**
 * Screenshoty všetkých obrazoviek so všetkými textami — na kontrolu, či sa
 * wording zmestí. Dva rozmery: iPad Pro 12,9" a Lenovo Tab M10 HD v Chrome.
 *
 *   npm run dev            (v druhom okne)
 *   node tools/shots-wording.mjs [výstup]
 */
import { webkit } from '@playwright/test';
import { mkdirSync, readFileSync } from 'node:fs';

const OUT = process.argv[2] ?? 'shots/wording';
const URL_BASE = process.env.SHOTS_URL ?? 'http://localhost:5173';
const raw = JSON.parse(readFileSync(new URL('../public/config.json', import.meta.url), 'utf-8'));
const day = new Date().toISOString().slice(0, 10);
const entry = (raw.schedule ?? []).slice().sort((a, b) => a.from.localeCompare(b.from))
  .reduce((acc, e) => (e.from <= day ? e : acc), (raw.schedule ?? [])[0]);
const code = String({ ...raw, ...(entry ?? {}) }.code);

const SIZES = { ipad: { width: 1366, height: 1024 }, lenovo: { width: 962, height: 601 } };
const browser = await webkit.launch();

for (const [dev, viewport] of Object.entries(SIZES)) {
  const dir = `${OUT}/${dev}`;
  mkdirSync(dir, { recursive: true });

  const open = async (game) => {
    const page = await browser.newPage({ viewport, hasTouch: true });
    await page.addInitScript((o) => localStorage.setItem('tdr.override', JSON.stringify(o)),
      { rounds: 1, ...(game ? { game } : {}) });
    await page.goto(`${URL_BASE}/?debug=1`);
    await page.waitForSelector('[data-t="attract"]');
    // ladiace koliesko nepatrí do screenshotu
    await page.addStyleTag({ content: '.dbg,.dbg-toggle,[class*="debug"]{display:none!important}' });
    return page;
  };
  const shot = (page, n) => page.screenshot({ path: `${dir}/${n}.png` });

  // úvod a kód
  let page = await open();
  await page.waitForTimeout(900);
  await shot(page, '01-uvod');
  await page.locator('[data-t="attract"]').click();
  await page.waitForSelector('[data-t="code"]');
  for (const d of '000000') await page.locator(`[data-t="key-${d}"]`).click();
  await page.waitForTimeout(300);
  await shot(page, '02-kod-zly');
  await page.close();

  for (const game of ['draw', 'push', 'memorize', 'release']) {
    page = await open(game);
    await page.locator('[data-t="attract"]').click();
    for (const d of code) await page.locator(`[data-t="key-${d}"]`).click();
    await page.waitForSelector('[data-t="tutorial"]');
    await page.waitForTimeout(400);
    await shot(page, `${game}-1-navod`);
    await page.locator('[data-t="start"]').click();
    await page.waitForFunction(() => Boolean(window.__tdr?.probe));
    await page.waitForTimeout(500);
    await shot(page, `${game}-2-start`);

    if (game === 'draw') {
      await page.evaluate(() => {
        const a = window.__tdr;
        a.replay(a.trace(a.probe.path, { to: 0.62, wobble: 9 }));
      });
    } else if (game === 'push') {
      const area = (await page.locator('.g__area').boundingBox());
      await page.mouse.move(area.x + area.width / 2, area.y + area.height / 2);
      await page.mouse.down();
      await page.waitForFunction(() => window.__tdr.probe.info().value > 102);
      await shot(page, `${game}-3-nad-stovkou`);
      await page.waitForFunction(() => window.__tdr.probe.info().value > 117);
      await page.mouse.up();
    } else if (game === 'memorize') {
      await page.waitForTimeout(600);
      await shot(page, `${game}-3-sleduj`);
      await page.waitForFunction(() => window.__tdr.probe.info().phase === 'input', undefined, { timeout: 15000 });
      await shot(page, `${game}-4-na-rade`);
      const { seq } = await page.evaluate(() => window.__tdr.probe.info());
      await page.evaluate((w) => window.__tdr.replay([{ x: w, y: 0, t: 0 }]), (seq[0] + 1) % 4);
    } else if (game === 'release') {
      const throwAt = (miss) => page.evaluate((m) => {
        const p = window.__tdr.probe;
        const { anchor, target, rangeK } = p.info();
        p.replay([{ x: anchor.x + m, y: anchor.y + (anchor.y - target.y) / rangeK, t: 0 }]);
      }, miss);
      await throwAt(400);
      await page.waitForTimeout(900);
      await shot(page, `${game}-3-mimo-terca`);
      await throwAt(400); await page.waitForTimeout(700);
      await throwAt(400);
    }
    await page.waitForTimeout(450);
    await shot(page, `${game}-5-koniec-kola`);
    await page.waitForSelector('[data-t="result"]', { timeout: 20000 });
    await page.waitForTimeout(500);
    await shot(page, `${game}-6-vysledok`);
    await page.close();
  }

  // výhra — memorize sa dá vyhrať spoľahlivo
  page = await open('memorize');
  await page.locator('[data-t="attract"]').click();
  for (const d of code) await page.locator(`[data-t="key-${d}"]`).click();
  await page.locator('[data-t="start"]').click();
  await page.waitForFunction(() => window.__tdr?.probe?.info().phase === 'input', undefined, { timeout: 15000 });
  const { seq } = await page.evaluate(() => window.__tdr.probe.info());
  await page.evaluate((s) => window.__tdr.replay(s.map((i) => ({ x: i, y: 0, t: 0 }))), seq);
  await page.waitForTimeout(300);
  await shot(page, 'memorize-7-vyborne');
  await page.waitForSelector('[data-t="result"]', { timeout: 20000 });
  await page.waitForTimeout(500);
  await shot(page, 'memorize-8-vysledok-vyhra');
  await page.close();
}

await browser.close();
console.log(`hotovo → ${OUT}/`);
