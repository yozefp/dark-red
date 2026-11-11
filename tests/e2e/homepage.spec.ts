import { test, expect } from '@playwright/test';

/**
 * Holá adresa je aplikácia do predajne — z nej sa pridáva na plochu.
 * Výber hier bez kódu je na /erik/.
 */
test('holá adresa ukáže aplikáciu do predajne', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('[data-t="attract"]')).toBeVisible();
  await expect(page).toHaveURL(/\/$/);
});

test('?predajna=1 funguje ďalej, kvôli tabletom pridaným z nej', async ({ page }) => {
  await page.goto('/?predajna=1');
  await expect(page.locator('[data-t="attract"]')).toBeVisible();
});
