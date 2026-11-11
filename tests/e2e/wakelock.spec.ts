import { test, expect, type Page } from '@playwright/test';

/**
 * Obrazovka nesmie zhasnúť — výber hier aj aplikácia si pýtajú zámok
 * obrazovky. Skutočný zámok overí až tablet; tu sa kontroluje, že sa pýta.
 */
async function spy(page: Page) {
  await page.addInitScript(() => {
    (window as any).__wake = 0;
    Object.defineProperty(navigator, 'wakeLock', {
      configurable: true,
      value: { request: async () => { (window as any).__wake++; return { released: false, release: async () => {} }; } },
    });
  });
}

test('výber hier si pýta zámok obrazovky', async ({ page }) => {
  await spy(page);
  await page.goto('/');
  await expect(page.locator('.pick button')).toHaveCount(4);
  await expect.poll(() => page.evaluate(() => (window as any).__wake)).toBeGreaterThan(0);
});

test('aplikácia do predajne si pýta zámok obrazovky', async ({ page }) => {
  await spy(page);
  await page.goto('/?predajna=1');
  await expect(page.locator('[data-t="attract"]')).toBeVisible();
  await expect.poll(() => page.evaluate(() => (window as any).__wake)).toBeGreaterThan(0);
});
