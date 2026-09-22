import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './strixhaven', testMatch: 'phb.spec.mjs', timeout: 60000, workers: 1, reporter: 'list',
  outputDir: '../../assets-private/entrega/playwright-phb-python',
  use: { baseURL: 'http://127.0.0.1:8000/site/', serviceWorkers: 'block' },
  webServer: { command: 'python3 -m http.server 8000 --bind 127.0.0.1 --directory ../..', url: 'http://127.0.0.1:8000/site/', reuseExistingServer: true, stdout: 'ignore', stderr: 'ignore' },
});
