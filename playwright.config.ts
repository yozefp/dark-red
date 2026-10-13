import { defineConfig, devices } from '@playwright/test';

/**
 * Hrá sa výhradne na ležato na tablete, takže aj testy bežia v takom okne.
 * WebKit zastupuje iPad, Chromium androidové tablety — to sú dva reálne
 * prehliadače, v ktorých hra pobeží v predajni.
 */
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  expect: { timeout: 7_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'list' : [['list'], ['html', { open: 'never' }]],
  use: { baseURL: 'http://localhost:5173', hasTouch: true },
  projects: [
    {
      name: 'ipad',
      use: { ...devices['iPad Pro 11'], viewport: { width: 1194, height: 834 }, hasTouch: true },
    },
    {
      name: 'android-tablet',
      use: { ...devices['Galaxy Tab S4 landscape'], hasTouch: true },
    },
  ],
  // Druhý server je zostavená verzia — offline vrstva beží len tam,
  // vo vývoji by service worker podával staré súbory.
  webServer: [
    {
      command: 'npm run dev',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
    {
      command: 'npm run build && npm run preview -- --port 4273',
      url: 'http://localhost:4273',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
});
