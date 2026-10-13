import { test, expect } from '@playwright/test';

const BUILT = 'http://localhost:4273';

/**
 * Overuje nasadenú verziu, nie vývojovú — service worker beží len tam.
 * Toto je ten prípad, keď v predajni vypadne wifi.
 */
test.describe('offline', () => {
  test.describe.configure({ mode: 'serial' });

  test('po prvom načítaní nabehne aj bez siete', async ({ page, context }) => {
    await page.goto(BUILT);
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
    await page.goto(BUILT);
    await expect(page.locator('[data-t="attract"]')).toBeVisible();
    await page.waitForFunction(
      () => navigator.serviceWorker.controller !== null, undefined, { timeout: 15_000 });
    await page.waitForTimeout(800);

    const online = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('tdr.config') ?? 'null'));
    expect(online).not.toBeNull();

    await context.setOffline(true);
    await page.reload();
    await page.locator('[data-t="attract"]').click();
    for (const d of String(online.code)) await page.locator(`[data-t="key-${d}"]`).click();
    await expect(page.locator('[data-t="tutorial"]')).toBeVisible({ timeout: 10_000 });
    await context.setOffline(false);
  });
});
