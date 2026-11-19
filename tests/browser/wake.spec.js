import { test, expect } from '@playwright/test';
async function mock(page, mode = 'success') {
 await page.addInitScript(mode => {
  window.locks = []; window.requests = 0; window.pendingLocks = [];
  Object.defineProperty(navigator, 'wakeLock', { configurable:true, value: mode === 'unsupported' ? undefined : {
   request: async () => {
    window.requests++;
    if (mode === 'reject') throw new Error('Denied');
    const lock = new EventTarget(); lock.released = false;
    lock.release = async () => { lock.released = true; lock.dispatchEvent(new Event('release')); };
    window.locks.push(lock);
    if (mode === 'pending') await new Promise(resolve => window.pendingLocks.push(resolve));
    return lock;
   }
  }});
 }, mode);
 await page.goto('/tabata-timer/');
}
const start = page => page.getByRole('button', { name:'Aloita treeni' }).click();
test('lock acquired and released on pause, reset and finish', async ({page}) => {
 await mock(page); await page.clock.install();
 await start(page); await expect(page.locator('#wake-status')).toContainText('aktiivinen');
 await page.getByRole('button',{name:'Keskeytä'}).click();
 expect(await page.evaluate(() => locks[0].released)).toBe(true);
 await page.getByRole('button',{name:'Jatka treeniä'}).click();
 await expect.poll(() => page.evaluate(() => locks.length)).toBe(2);
 await page.getByRole('button',{name:'Nollaa'}).click();
 expect(await page.evaluate(() => locks[1].released)).toBe(true);
 await start(page); await page.clock.runFor(241000);
 await expect(page.locator('#phase')).toHaveText('Valmis!');
 expect(await page.evaluate(() => locks[2].released)).toBe(true);
});
for (const mode of ['unsupported','reject']) test(`honest warning for ${mode}`, async ({page}) => {
 await mock(page, mode); await start(page);
 await expect(page.locator('#wake-status')).toContainText('Näyttö voi sammua');
});
test('release warning and reacquisition after returning visible', async ({page}) => {
 await mock(page); await start(page);
 await page.evaluate(() => locks[0].release());
 await expect(page.locator('#wake-status')).toContainText('Näyttö voi sammua');
 await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));
 await expect.poll(() => page.evaluate(() => locks.length)).toBe(2);
 await expect(page.locator('#wake-status')).toContainText('aktiivinen');
});
test('hidden document releases its lock and visibility return requests a new one', async ({page}) => {
 await mock(page); await start(page);
 await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', {configurable:true,value:'hidden'}); document.dispatchEvent(new Event('visibilitychange')); });
 expect(await page.evaluate(() => locks[0].released)).toBe(true);
 await expect(page.locator('#wake-status')).toContainText('Näyttö voi sammua');
 await page.evaluate(() => { Object.defineProperty(document, 'visibilityState', {configurable:true,value:'visible'}); document.dispatchEvent(new Event('visibilitychange')); });
 await expect.poll(() => page.evaluate(() => requests)).toBe(2);
 await expect(page.locator('#wake-status')).toContainText('aktiivinen');
});
test('pending acquisition is released when reset before resolution', async ({page}) => {
 await mock(page, 'pending'); await start(page);
 await page.getByRole('button',{name:'Nollaa'}).click();
 await page.evaluate(() => pendingLocks[0]());
 await expect.poll(() => page.evaluate(() => locks[0].released)).toBe(true);
 expect(await page.evaluate(() => requests)).toBe(1);
 await expect(page.locator('#wake-status')).toContainText('ei ole käytössä');
});
test('pending request cannot leak after pause and rapid resume', async ({page}) => {
 await mock(page, 'pending'); await start(page);
 await expect.poll(() => page.evaluate(() => requests)).toBe(1);
 await page.getByRole('button',{name:'Keskeytä'}).click();
 await page.getByRole('button',{name:'Jatka treeniä'}).click();
 await page.evaluate(() => pendingLocks[0]());
 await expect.poll(() => page.evaluate(() => locks[0].released)).toBe(true);
 await expect.poll(() => page.evaluate(() => requests)).toBe(2);
 await page.evaluate(() => pendingLocks[1]());
 await expect(page.locator('#wake-status')).toContainText('aktiivinen');
 expect(await page.evaluate(() => locks.filter(x => !x.released).length)).toBe(1);
});
