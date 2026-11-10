// Renders tools/icon.svg to assets/icon-1024.png with Playwright's Chromium:
// node tools/render-icon.cjs (from the app's folder).
const { chromium } = require('playwright');
const { readFileSync } = require('node:fs');
const { resolve } = require('node:path');

(async () => {
  const svg = readFileSync(resolve(__dirname, 'icon.svg'), 'utf8');
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1024, height: 1024 }, deviceScaleFactor: 1 });
  await page.setContent(`<!doctype html><html><body style="margin:0;background:#0a0a0b">${svg}</body></html>`);
  await page.locator('svg').screenshot({ path: resolve(__dirname, '../assets/icon-1024.png'), omitBackground: false });
  await browser.close();
})();
