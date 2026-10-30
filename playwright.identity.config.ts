import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/identity/browser', fullyParallel: false, workers: 1,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: { baseURL: 'http://127.0.0.1:4173/dns-workspace/', trace: 'retain-on-failure' },
  webServer: { command: 'npm run dev -- --mode identity-e2e --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173/dns-workspace/', reuseExistingServer: false },
});
