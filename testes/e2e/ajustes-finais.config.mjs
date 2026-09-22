import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir:'./ajustes-finais', timeout:45000, workers:1, reporter:'list',
  outputDir:'../../assets-private/entrega/playwright-ajustes-finais',
  use:{ baseURL:'http://127.0.0.1:8030/site/', serviceWorkers:'block', viewport:{ width:1280,height:900 } },
  webServer:{ command:'python3 -m http.server 8030 --bind 127.0.0.1 --directory ../..', url:'http://127.0.0.1:8030/site/', reuseExistingServer:true, stdout:'ignore',stderr:'ignore' },
});
