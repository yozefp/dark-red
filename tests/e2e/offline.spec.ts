import { test, expect } from '@playwright/test';
import { parseConfig } from '../../src/core/config';

const BUILT = 'http://localhost:4273';

/**
 * Overuje nasadenú verziu, nie vývojovú — service worker beží len tam.
 * Toto je ten prípad, keď v predajni vypadne wifi.
 */
test.describe('offline', () => {
  test.describe.configure({ mode: 'serial' });

  test('po prvom načítaní nabehne aj bez siete', async ({ page, context }) => {
    await page.goto(`${BUILT}/?predajna=1`);
    await expect(page.locator('[data-t="attract"]')).toBeVisible();

    await page.waitForFunction(
      () => navigator.serviceWorker.controller !== null, undefined, { timeout: 15_000 });
    // kým sa shell nedostane do cache, test by meral niečo iné
    await page.waitForTimeout(800);

    await context.setOffline(true);
    await page.reload();
    await expect(page.locator('[data-t="attract"]')).toBeVisible({ timeout: 15_000 });

    // a hra sa musí dať aj odohrať
    await page.locator('[data-t="attract"]').click();
    await expect(page.locator('[data-t="code"]')).toBeVisible();
    await context.setOffline(false);
  });

  test('bez siete sa použije posledná známa konfigurácia', async ({ page, context }) => {
    await page.goto(`${BUILT}/?predajna=1`);
    await expect(page.locator('[data-t="attract"]')).toBeVisible();
    await page.waitForFunction(
      () => navigator.serviceWorker.controller !== null, undefined, { timeout: 15_000 });
    await page.waitForTimeout(800);

    const online = parseConfig(await page.evaluate(() =>
      JSON.parse(localStorage.getItem('tdr.config') ?? 'null')));

    await context.setOffline(true);
    await page.reload();
    await page.locator('[data-t="attract"]').click();
    for (const d of String(online.code)) await page.locator(`[data-t="key-${d}"]`).click();
    await expect(page.locator('[data-t="tutorial"]')).toBeVisible({ timeout: 10_000 });
    await context.setOffline(false);
  });

  test('bez siete si tablet ďalší týždeň vyberie sám podľa dátumu', async ({ page, context }) => {
    await page.goto(`${BUILT}/?predajna=1`);
    await expect(page.locator('[data-t="attract"]')).toBeVisible();
    await page.waitForFunction(
      () => navigator.serviceWorker.controller !== null, undefined, { timeout: 15_000 });
    await page.waitForTimeout(800);

    const raw = await page.evaluate(() => JSON.parse(localStorage.getItem('tdr.config') ?? 'null'));
    expect(Array.isArray(raw.schedule)).toBe(true);
    const weeks = [...raw.schedule].sort((a: { from: string }, b: { from: string }) => a.from.localeCompare(b.from));
    const later = weeks[weeks.length - 1];

    // tablet bez wifi, o niekoľko týždňov neskôr
    await context.setOffline(true);
    await page.clock.setSystemTime(new Date(`${later.from}T12:00:00`));
    await page.reload();
    await page.locator('[data-t="attract"]').click();
    for (const d of String(later.code)) await page.locator(`[data-t="key-${d}"]`).click();
    await expect(page.locator('[data-t="tutorial"]')).toBeVisible({ timeout: 10_000 });
    await context.setOffline(false);
  });
});
