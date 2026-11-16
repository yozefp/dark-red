import { test, expect } from '@playwright/test';

/**
 * Hlavná adresa je aplikácia s kódom — z nej sú tablety na prevádzkach.
 * Zákazník nesmie vidieť prepínač hier (klientka 16. 11.).
 * Všetky hry naraz sú na /vecierok/ (bez PIN-u) a /erik/ (pod PIN-om).
 * Dev server priečinok neotvorí, preto index.html; Cloudflare áno.
 */
test('holá adresa je aplikácia s kódom, bez prepínača hier', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-t="attract"]')).toBeVisible();
  await expect(page.locator('.pick')).toHaveCount(0);
  await expect(page).toHaveURL(/\/$/);
});

test('/vecierok/ má všetky štyri hry, bez PIN-u', async ({ page }) => {
  await page.goto('/vecierok/index.html');
  await expect(page.locator('.pick button')).toHaveCount(4);
  await expect(page.locator('#lock')).toBeHidden();
  await expect(page.frameLocator('#game').locator('[data-t="attract"]')).toBeVisible();
});

test('/erik/ je ten istý výber, pod PIN-om', async ({ page }) => {
  await page.goto('/erik/index.html');
  await expect(page.locator('#lock')).toBeVisible();
  await page.locator('#pin').fill('8624');
  await expect(page.locator('#lock')).toBeHidden();
  await expect(page.frameLocator('#game').locator('[data-t="attract"]')).toBeVisible();
});

test('kód kampane je štvormiestny', async ({ page }) => {
  await page.goto('/');
  await page.locator('[data-t="attract"]').click();
  await expect(page.locator('.code__cell')).toHaveCount(4);
  for (const d of '2511') await page.locator(`[data-t="key-${d}"]`).click();
  await expect(page.locator('[data-t="tutorial"]')).toBeVisible();
});
