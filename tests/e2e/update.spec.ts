import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

/**
 * Aktualizácia na diaľku na zostavenej verzii. Čas je simulovaný,
 * config.json z „nového nasadenia" podstrčíme cez route — service worker
 * je preto vypnutý, inak by požiadavku vybavil on.
 */
const BUILT = 'http://localhost:4273';
const raw = JSON.parse(readFileSync(new URL('../../public/config.json', import.meta.url), 'utf-8'));
const MIN = 60_000;

test.use({ serviceWorkers: 'block' });

async function boot(page: Page) {
  let changed = false;
  await page.route('**/config.json*', (route) => route.fulfill({
    contentType: 'application/json',
    body: JSON.stringify(changed ? { ...raw, schedule: undefined, code: '999999', game: 'push' } : raw),
  }));
  await page.clock.install();
  await page.goto(`${BUILT}/?predajna=1`);
  await expect(page.locator('[data-t="attract"]')).toBeVisible();
  await page.evaluate(() => { (window as any).__beforeReload = true; });
  return { change: () => { changed = true; } };
}

const reloaded = (page: Page) =>
  page.evaluate(() => !(window as any).__beforeReload).catch(() => false);

test('nový kód sa na úvode prejaví sám po tichu', async ({ page }) => {
  const { change } = await boot(page);
  change();
  await page.clock.runFor(10 * MIN);           // kontrola zistí zmenu
  await page.waitForTimeout(300);              // fetch beží v reálnom čase
  await page.clock.runFor(1 * MIN);            // ticho už trvá 11 minút
  await expect.poll(() => reloaded(page)).toBe(true);
});

test('dotyk obnovenie odloží, počas kódu ani hneď po ňom nepríde', async ({ page }) => {
  const { change } = await boot(page);
  change();
  await page.clock.runFor(9.5 * MIN);
  // zákazník príde tesne pred kontrolou
  await page.locator('[data-t="attract"]').click();
  await expect(page.locator('[data-t="code"]')).toBeVisible();
  await page.clock.runFor(1 * MIN);            // kontrola zistí zmenu, tablet je na kóde
  await page.waitForTimeout(300);
  await page.clock.runFor(1 * MIN);            // nečinnosť ho vráti na úvod, ticho trvá len 2 minúty
  expect(await reloaded(page)).toBe(false);
  await expect(page.locator('[data-t="attract"]')).toBeVisible();

  await page.clock.runFor(4 * MIN);            // až po piatich minútach ticha
  await expect.poll(() => reloaded(page)).toBe(true);
});

test('bez zmeny sa neobnoví ani po hodine', async ({ page }) => {
  await boot(page);
  for (let i = 0; i < 6; i++) {
    await page.clock.runFor(10 * MIN);
    await page.waitForTimeout(200);
  }
  expect(await reloaded(page)).toBe(false);
});
