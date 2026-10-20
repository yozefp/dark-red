import { test, expect, type Page } from '@playwright/test';

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global { interface Window { __tdr: any } }

/**
 * V predajni sa ľudia o tablet opierajú. Druhý dotyk nesmie prerušiť ťah
 * ani pustiť meter — hra sleduje vždy len prst, ktorý sa dotkol ako prvý.
 */
async function play(page: Page, game: string) {
  await page.addInitScript(
    (o) => localStorage.setItem('tdr.override', JSON.stringify(o)), { rounds: 1, game });
  await page.goto('/?debug=1&nocode=1');
  await page.locator('[data-t="attract"]').click();
  await page.locator('[data-t="start"]').click();
  await expect(page.locator('[data-t="playing"]')).toBeVisible();
  await page.waitForFunction(() => Boolean(window.__tdr?.probe));
}

test('PUSH — zdvihnutie druhého prsta meter nepustí', async ({ page }) => {
  await play(page, 'push');
  const area = (await page.locator('.g__area').boundingBox())!;
  const cx = area.x + area.width / 2, cy = area.y + area.height / 2;

  // prvý prst drží, druhý doplníme ručne vyslaným dotykom
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.waitForFunction(() => window.__tdr.probe.info().value > 30);

  // druhý prst sa dotkne a zdvihne
  await page.evaluate(() => {
    const el = document.querySelector('.g__area') as HTMLElement;
    const r = el.getBoundingClientRect();
    const mk = (type: string) => new PointerEvent(type, {
      pointerId: 99, bubbles: true, clientX: r.left + 20, clientY: r.top + 20 });
    el.dispatchEvent(mk('pointerdown'));
    window.dispatchEvent(mk('pointerup'));
  });

  // meter musí bežať ďalej
  const before = await page.evaluate(() => window.__tdr.probe.info().value);
  await page.waitForTimeout(400);
  const after = await page.evaluate(() => window.__tdr.probe.info().value);
  expect(after).toBeGreaterThan(before);
  await page.mouse.up();
});

test('DRAW — druhý dotyk neukončí rozkreslený ťah', async ({ page }) => {
  await play(page, 'draw');
  await page.waitForFunction(() => window.__tdr.probe.path?.length > 0);

  const canvas = (await page.locator('canvas').boundingBox())!;
  const pt = await page.evaluate(() => {
    const p = window.__tdr.probe;
    return { path: p.path, view: p.view };
  });
  const toPage = (i: number) => ({
    x: canvas.x + (pt.path[i].x / pt.view) * canvas.width,
    y: canvas.y + (pt.path[i].y / pt.view) * canvas.height,
  });

  const start = toPage(0);
  await page.mouse.move(start.x, start.y);
  await page.mouse.down();
  for (let i = 1; i < 60; i++) { const p = toPage(i); await page.mouse.move(p.x, p.y); }

  await page.evaluate(() => {
    const el = document.querySelector('canvas') as HTMLElement;
    const mk = (type: string) => new PointerEvent(type, {
      pointerId: 99, bubbles: true, clientX: 5, clientY: 5 });
    el.dispatchEvent(mk('pointerdown'));
    window.dispatchEvent(mk('pointerup'));
  });

  // ťah stále beží — kolo sa neukončilo
  await expect(page.locator('[data-t="result"]')).toHaveCount(0);
  for (let i = 60; i < 140; i++) { const p = toPage(i); await page.mouse.move(p.x, p.y); }
  expect(await page.evaluate(() => window.__tdr.probe.score())).toBeGreaterThan(0.3);
  await page.mouse.up();
});
