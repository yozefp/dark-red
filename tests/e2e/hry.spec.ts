import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { parseConfig } from '../../src/core/config';

// cez tú istú funkciu, akú používa aplikácia — rozvrh aj tu vyberie dnešný týždeň
const cfg = parseConfig(
  JSON.parse(readFileSync(new URL('../../public/config.json', import.meta.url), 'utf-8')));

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global { interface Window { __tdr: any } }

/** Spustí zadanú hru v jednom kole. */
async function play(page: Page, game: string, extra: Record<string, unknown> = {}) {
  await page.addInitScript(
    (o) => localStorage.setItem('tdr.override', JSON.stringify(o)),
    { rounds: 1, game, ...extra });
  await page.goto('/?debug=1');
  await page.locator('[data-t="attract"]').click();
  for (const d of String(cfg.code)) await page.locator(`[data-t="key-${d}"]`).click();
  await page.locator('[data-t="start"]').click();
  await expect(page.locator('[data-t="playing"]')).toBeVisible();
  await page.waitForFunction(() => Boolean(window.__tdr?.probe));
}

const info = (page: Page) => page.evaluate(() => window.__tdr.probe.info());

test.describe('PUSH', () => {
  test('držanie prerazí strop a pustenie v pásme prejde', async ({ page }) => {
    await play(page, 'push');
    const area = (await page.locator('.g__area').boundingBox())!;
    await page.mouse.move(area.x + area.width / 2, area.y + area.height / 2);
    await page.mouse.down();

    // drž, kým meter nedosiahne cieľové pásmo
    await page.waitForFunction(() => {
      const i = window.__tdr.probe.info();
      return i.over && Math.abs(i.value - i.target) < i.band * 0.6;
    }, undefined, { timeout: 15_000 });
    await page.mouse.up();

    await expect(page.locator('[data-t="result"]')).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('[data-t="result"]')).toContainText('obsluhe');
  });

  test('pustenie pred stovkou neprejde', async ({ page }) => {
    await play(page, 'push');
    const area = (await page.locator('.g__area').boundingBox())!;
    await page.mouse.move(area.x + area.width / 2, area.y + area.height / 2);
    await page.mouse.down();
    await page.waitForFunction(() => window.__tdr.probe.info().value > 40);
    await page.mouse.up();
    await expect(page.locator('[data-t="result"]')).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('[data-t="result"]')).toContainText(/nevyšlo/i);
  });

  test('predržanie za hranicu spáli kolo aj bez pustenia', async ({ page }) => {
    await play(page, 'push');
    const area = (await page.locator('.g__area').boundingBox())!;
    await page.mouse.move(area.x + area.width / 2, area.y + area.height / 2);
    await page.mouse.down();
    await expect(page.locator('[data-t="result"]')).toBeVisible({ timeout: 25_000 });
    await page.mouse.up();
    await expect(page.locator('[data-t="result"]')).toContainText(/nevyšlo/i);
  });
});

test.describe('MEMORIZE', () => {
  test('správne zopakované poradie prejde', async ({ page }) => {
    await play(page, 'memorize');
    await page.waitForFunction(() => window.__tdr.probe.info().phase === 'input',
      undefined, { timeout: 15_000 });

    const { seq } = await info(page) as { seq: number[] };
    expect(seq.length).toBeGreaterThan(2);
    await page.evaluate((s) => {
      window.__tdr.replay(s.map((i: number) => ({ x: i, y: 0, t: 0 })));
    }, seq);

    // Jas sa meria, keď je záblesk nabehnutý — hneď po ťuknutí je ešte
    // na nule, lebo nábeh beží až v ďalšom snímku.
    const jas = () => page.evaluate(() => {
      const c = document.querySelector('canvas') as HTMLCanvasElement;
      const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
      let sum = 0, n = 0;
      for (let k = 0; k < d.length; k += 4 * 53) { sum += d[k]; n++; }
      return sum / n;
    });
    await page.waitForTimeout(160);
    const hned = await jas();

    // po celom zopakovanom poradí musí byť odpoveď veľkým nad kvetom
    await expect(page.locator('.memo__flash.ok')).toHaveText('SPRÁVNE');
    await expect(page.locator('.g__status .dot--done')).toHaveCount(seq.length);
    await expect(page.locator('.g__status .dot--bad')).toHaveCount(0);

    // posledné ťuknutie nesmie ostať svietiť — blikne a zhasne ako každé iné
    await page.waitForTimeout(700);
    expect(await jas()).toBeLessThan(hned * 0.6);

    await expect(page.locator('[data-t="result"]')).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('[data-t="result"]')).toContainText('obsluhe');
  });

  test('zlé poradie kolo ukončí', async ({ page }) => {
    await play(page, 'memorize');
    await page.waitForFunction(() => window.__tdr.probe.info().phase === 'input',
      undefined, { timeout: 15_000 });

    const { seq } = await info(page) as { seq: number[] };
    // iný lupeň než ten prvý správny
    await page.evaluate((wrong) => {
      window.__tdr.replay([{ x: wrong, y: 0, t: 0 }]);
    }, (seq[0] + 1) % 4);

    // chybný krok sa musí okamžite ukázať veľkým nad kvetom
    await expect(page.locator('.memo__flash.bad')).toHaveText('CHYBA');
    await expect(page.locator('.g__status .dot--bad')).toHaveCount(1);

    await expect(page.locator('[data-t="result"]')).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('[data-t="result"]')).toContainText(/nevyšlo/i);
  });

  test('medzikrok nehlási nič, hláška je až za celé kolo', async ({ page }) => {
    await play(page, 'memorize');
    await page.waitForFunction(() => window.__tdr.probe.info().phase === 'input',
      undefined, { timeout: 15_000 });
    const { seq } = await info(page) as { seq: number[] };
    expect(seq.length).toBeGreaterThan(1);

    // prvý správny krok z dlhšieho poradia
    await page.evaluate((s) => window.__tdr.replay([{ x: s[0], y: 0, t: 0 }]), seq);

    // SPRÁVNE sa pri medzikroku nesmie ukázať ani na chvíľu — odvádzalo by
    // oči od lupeňov, kým si hráč drží poradie v hlave. Hláška by sa
    // nastavila ešte v tom istom ťuknutí, čiže tu už musí byť vidieť.
    await expect(page.locator('.memo__flash.on')).toHaveCount(0);
    expect((await info(page) as { got: number[] }).got).toHaveLength(1);
    await page.waitForTimeout(500);
    await expect(page.locator('.memo__flash.on')).toHaveCount(0);
  });

  test('počas ukážky sa ťuknutia nepočítajú', async ({ page }) => {
    await play(page, 'memorize');
    await page.evaluate(() => window.__tdr.replay([{ x: 0, y: 0, t: 0 }]));
    expect((await info(page) as { got: number[] }).got).toHaveLength(0);
  });
});

test.describe('RELEASE', () => {
  /** Vypočíta ťah, ktorý trafí stred, a prehrá ho. */
  async function throwAt(page: Page, missBy = 0) {
    await page.evaluate((miss) => {
      const p = window.__tdr.probe;
      const { anchor, target, rangeK } = p.info();
      const need = (anchor.y - target.y) / rangeK;
      p.replay([{ x: anchor.x + miss, y: anchor.y + need, t: 0 }]);
    }, missBy);
  }

  test('presný hod trafí stred a kolo prejde', async ({ page }) => {
    await play(page, 'release');
    await throwAt(page);
    await expect(page.locator('[data-t="result"]')).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('[data-t="result"]')).toContainText('obsluhe');
    await expect(page.locator('[data-t="result"]')).toContainText(/MM OD STREDU/i);
  });

  test('tri hody vedľa kolo ukončia', async ({ page }) => {
    await play(page, 'release');
    for (let i = 0; i < 3; i++) {
      await throwAt(page, 140);
      await page.waitForTimeout(600);
    }
    await expect(page.locator('[data-t="result"]')).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('[data-t="result"]')).toContainText(/nevyšlo/i);
  });

  test('platí najlepší z hodov', async ({ page }) => {
    await play(page, 'release');
    await throwAt(page, 150);
    await page.waitForTimeout(600);
    await throwAt(page);
    await expect(page.locator('[data-t="result"]')).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('[data-t="result"]')).toContainText('obsluhe');
  });
});
