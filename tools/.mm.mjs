import { webkit } from '@playwright/test';
const b = await webkit.launch();
const p = await b.newPage({ viewport: { width: 1194, height: 834 }, hasTouch: true });
p.on('pageerror', e => console.log('[err]', e.message));
await p.goto('http://localhost:5173/?debug=1&nocode=1&game=memorize');
await p.locator('[data-t="attract"]').click();
await p.locator('[data-t="start"]').click();
for (let i = 0; i < 60; i++) {
  const lit = await p.evaluate(() => {
    const c = document.querySelector('canvas'); const g = c.getContext('2d');
    const d = g.getImageData(0, 0, c.width, c.height).data;
    let o = 0;
    for (let k = 0; k < d.length; k += 4 * 97) if (d[k] > 180 && d[k+1] > 60 && d[k+1] < 175) o++;
    return o;
  });
  if (lit > 40) break;
  await p.waitForTimeout(50);
}
await p.screenshot({ path: 'shots/rev/memo-z-predlohy.png' });
await b.close();
