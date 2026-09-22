import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './magias', timeout: 60000, workers: 1, reporter: 'list',
  outputDir: '../../assets-private/entrega/playwright-magias',
  use: { baseURL: 'http://127.0.0.1:8024/site/', serviceWorkers: 'block', viewport: { width: 1280, height: 900 } },
  webServer: { command: 'python3 -m http.server 8024 --bind 127.0.0.1 --directory ../..', url: 'http://127.0.0.1:8024/site/', reuseExistingServer: true, stdout: 'ignore', stderr: 'ignore' },
});
