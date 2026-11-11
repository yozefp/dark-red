import { test, expect } from '@playwright/test';

/**
 * Hlavná adresa bez parametrov je výber hier — z nej sa pridáva na plochu.
 * Adresa ostane čistá: žiadne /erik ani #draw. Hra v ňom beží v iframe.
 */
test('holá adresa ukáže výber hier a adresu nezmení', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.pick button')).toHaveCount(4);
  await expect(page.locator('.pick button[aria-pressed="true"]')).toHaveText('DRAW');
  await expect(page.locator('#lock')).toBeHidden();
  await expect(page.frameLocator('#game').locator('[data-t="attract"]')).toBeVisible();
  await page.locator('.pick button', { hasText: 'PUSH' }).click();
  await expect(page.locator('.pick button[aria-pressed="true"]')).toHaveText('PUSH');
  expect(new URL(page.url()).pathname + new URL(page.url()).search + new URL(page.url()).hash).toBe('/');
});

test('aplikácia do predajne je na ?predajna=1', async ({ page }) => {
  await page.goto('/?predajna=1');
  await expect(page.locator('[data-t="attract"]')).toBeVisible();
  await expect(page.locator('.pick')).toHaveCount(0);
});

test('/erik/ je ten istý výber, pod PIN-om', async ({ page }) => {
  await page.goto('/erik/index.html');  // dev server priečinok neotvorí, Cloudflare áno
  await expect(page.locator('#lock')).toBeVisible();
  await page.locator('#pin').fill('8624');
  await expect(page.locator('#lock')).toBeHidden();
  await expect(page.frameLocator('#game').locator('[data-t="attract"]')).toBeVisible();
});
