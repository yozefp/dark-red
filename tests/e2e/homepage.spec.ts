import { test, expect } from '@playwright/test';

/**
 * Holá adresa je pre ľudí s odkazom — ukáže výber hier. Tablet v predajni
 * sa inštaluje z ?predajna=1 a nainštalovaná aplikácia ide rovno do hry.
 */
test('holá adresa v prehliadači presmeruje na výber hier', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveURL(/\/erik\/$/);
});

test('?predajna=1 ostane v aplikácii', async ({ page }) => {
  await page.goto('/?predajna=1');
  await expect(page.locator('[data-t="attract"]')).toBeVisible();
  await expect(page).toHaveURL(/\/\?predajna=1$/);
});

test('nainštalovaná aplikácia na holej adrese ostane v aplikácii', async ({ page }) => {
  await page.addInitScript(() => {
    const real = window.matchMedia.bind(window);
    window.matchMedia = (q: string) =>
      q.includes('display-mode') ? ({ ...real(q), matches: true } as MediaQueryList) : real(q);
  });
  await page.goto('/');
  await expect(page.locator('[data-t="attract"]')).toBeVisible();
  await expect(page).toHaveURL(/\/$/);
});
