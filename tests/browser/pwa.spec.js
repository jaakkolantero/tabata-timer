import {test, expect} from '@playwright/test';
test('manifest, icons and actual offline reload work under subpath', async ({page,context}) => {
 await page.goto('/tabata-timer/');
 await expect(page.locator('#offline-status')).toHaveText('Valmis offline-käyttöön');
 await page.evaluate(() => navigator.serviceWorker.ready);
 await expect(page.locator('#update')).toBeHidden();
 const manifest = await page.evaluate(async () => (await fetch('./manifest.webmanifest')).json());
 expect(manifest.start_url).toBe('./'); expect(manifest.scope).toBe('./'); expect(manifest.display).toBe('standalone');
 expect(manifest.icons.some(i => i.sizes === '192x192')).toBe(true);
 expect(manifest.icons.some(i => i.sizes === '512x512' && i.purpose === 'maskable')).toBe(true);
 for (const icon of manifest.icons) {
  const size = await page.evaluate(src => new Promise((resolve,reject) => { const img = new Image(); img.onload = () => resolve(`${img.width}x${img.height}`); img.onerror = reject; img.src = src; }), '/tabata-timer/' + icon.src);
  expect(size).toBe(icon.sizes);
 }
 await context.setOffline(true); await page.reload();
 await expect(page.getByRole('button',{name:'Aloita treeni'})).toBeVisible();
 await page.getByRole('button',{name:'Aloita treeni'}).click();
 await expect(page.locator('#state-badge')).toHaveText('TREENI KÄYNNISSÄ');
 await expect(page.locator('#offline-status')).toHaveText('Valmis offline-käyttöön');
});
test('waiting update is disabled during running and paused workout; controller change never reloads it', async ({page}) => {
 await page.addInitScript(() => {
  const sw = new EventTarget();
  const reg = new EventTarget(); reg.waiting = {postMessage: () => {window.updated = true;}};
  sw.register = async () => reg; sw.ready = Promise.resolve(reg); sw.controller = {};
  window.mockSW = sw; Object.defineProperty(navigator,'serviceWorker',{value:sw});
 });
 await page.goto('/tabata-timer/');
 await expect(page.locator('#update')).toBeVisible();
 await page.getByRole('button',{name:'Aloita treeni'}).click();
 await expect(page.locator('#update')).toBeDisabled();
 await page.evaluate(() => {window.sentinel = 1; mockSW.dispatchEvent(new Event('controllerchange'));});
 expect(await page.evaluate(() => window.sentinel)).toBe(1);
 await page.getByRole('button',{name:'Keskeytä'}).click();
 await expect(page.locator('#update')).toBeDisabled();
 await page.getByRole('button',{name:'Nollaa'}).click();
 await expect(page.locator('#update')).toBeEnabled();
 await page.locator('#update').click();
 expect(await page.evaluate(() => window.updated)).toBe(true);
});
