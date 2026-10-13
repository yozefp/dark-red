import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { parseConfig } from '../../src/core/config';

// cez tú istú funkciu, akú používa aplikácia — rozvrh aj tu vyberie dnešný týždeň
const cfg = parseConfig(
  JSON.parse(readFileSync(new URL('../../public/config.json', import.meta.url), 'utf-8')));

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global { interface Window { __tdr: any } }

/**
 * Konfiguráciu prebíjame rovnakým lokálnym prebitím, aké používa ladiaci
 * panel na tablete — test teda ide tou istou cestou ako skutočné ladenie.
 */
async function withConfig(page: Page, o: Record<string, unknown>) {
  await page.addInitScript(
    (ov) => localStorage.setItem('tdr.override', JSON.stringify(ov)), o);
}

async function unlock(page: Page) {
  await page.goto('/?debug=1');
  await expect(page.locator('[data-t="attract"]')).toBeVisible();
  await page.locator('[data-t="attract"]').click();
  await expect(page.locator('[data-t="code"]')).toBeVisible();
  for (const d of String(cfg.code)) await page.locator(`[data-t="key-${d}"]`).click();
  await expect(page.locator('[data-t="tutorial"]')).toBeVisible();
}

async function startGame(page: Page, round = 1) {
  await page.locator('[data-t="start"]').click();
  await expect(page.locator('[data-t="playing"]')).toBeVisible();
  await waitForRound(page, round);
}

const waitForRound = (page: Page, round: number) =>
  page.waitForFunction(
    (r) => window.__tdr?.probe?.round === r && window.__tdr.probe.path?.length > 0, round);

/** Prehrá ťah po dráhe so zadanou nepresnosťou a vráti skóre. */
const play = (page: Page, o: Record<string, number>) =>
  page.evaluate((opts) => {
    const api = window.__tdr;
    api.replay(api.trace(api.probe.path, opts));
    return api.probe.score() as number;
  }, o);

test('celý priebeh: pohľad → kód → tutoriál → hra → výsledok', async ({ page }) => {
  await withConfig(page, { rounds: 1 });
  await unlock(page);
  await startGame(page);

  expect(await play(page, { wobble: 0 })).toBeGreaterThan(0.85);
  await expect(page.locator('[data-t="result"]')).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('[data-t="result"]')).toContainText(/obsluhe/i);
});

test('tri kolá za sebou vedú k výsledku', async ({ page }) => {
  await withConfig(page, { rounds: 3 });
  await unlock(page);
  await startGame(page, 1);

  for (const round of [1, 2, 3]) {
    await waitForRound(page, round);
    expect(await play(page, { wobble: 0 })).toBeGreaterThan(0.85);
  }
  await expect(page.locator('[data-t="result"]')).toBeVisible({ timeout: 20_000 });
});

test('nesprávny kód hru nepustí', async ({ page }) => {
  await page.goto('/?debug=1');
  await page.locator('[data-t="attract"]').click();
  for (let i = 0; i < 6; i++) await page.locator('[data-t="key-9"]').click();
  await expect(page.locator('[data-t="code"]')).toBeVisible();
  await expect(page.locator('[data-t="tutorial"]')).toHaveCount(0);
});

test('nepresný ťah dá nižšie skóre než presný', async ({ page }) => {
  await withConfig(page, { rounds: 1 });

  await unlock(page); await startGame(page);
  const exact = await play(page, { wobble: 0 });

  await unlock(page); await startGame(page);
  const shaky = await play(page, { wobble: 22 });

  expect(shaky).toBeLessThan(exact);
});

test('nedokreslený tvar neprejde', async ({ page }) => {
  await unlock(page);
  await startGame(page);
  expect(await play(page, { to: 0.5 })).toBeLessThan(0.85);
  await expect(page.locator('[data-t="result"]')).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('[data-t="result"]')).toContainText(/nevyšlo|Skús/i);
});

test('nečinnosť vráti tablet na úvodnú obrazovku', async ({ page }) => {
  await withConfig(page, { idleTimeoutMs: 10_000 });
  await page.goto('/?debug=1');
  await page.locator('[data-t="attract"]').click();
  await expect(page.locator('[data-t="code"]')).toBeVisible();
  await expect(page.locator('[data-t="attract"]')).toBeVisible({ timeout: 15_000 });
});

test('výsledok sa po čase sám vráti na úvod', async ({ page }) => {
  await withConfig(page, { rounds: 1, resultTimeoutMs: 4_000 });
  await unlock(page);
  await startGame(page);
  await play(page, { wobble: 0 });
  await expect(page.locator('[data-t="result"]')).toBeVisible({ timeout: 20_000 });
  await expect(page.locator('[data-t="attract"]')).toBeVisible({ timeout: 12_000 });
});
