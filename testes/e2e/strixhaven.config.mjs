import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './strixhaven', timeout: 60000, workers: 1, reporter: 'list',
  outputDir: '../../assets-private/entrega/playwright-campanha',
  use: { baseURL: 'http://127.0.0.1:8802/site/', serviceWorkers: 'block', viewport: { width: 1440, height: 1000 } },
  webServer: { command: 'node servidor.mjs ../.. 8802', url: 'http://127.0.0.1:8802/site/', reuseExistingServer: true },
});
