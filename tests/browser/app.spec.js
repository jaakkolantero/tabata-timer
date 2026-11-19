import { test, expect } from '@playwright/test';
const path = '/tabata-timer/';
test('defaults, phases, pause, resume and reset', async ({page}) => {
 await page.clock.install(); await page.goto(path);
 await expect(page.getByLabel('Kierroksia')).toHaveValue('8');
 await expect(page.getByLabel('Työ (s)')).toHaveValue('20');
 await expect(page.getByLabel('Lepo (s)')).toHaveValue('10');
 await expect(page.getByLabel('Valmistautuminen (s)')).toHaveValue('10');
 await page.getByRole('button', {name:'Aloita treeni'}).click();
 await expect(page.locator('#phase')).toHaveText('Valmistaudu');
 await page.clock.runFor(10000); await expect(page.locator('#phase')).toHaveText('Työ');
 await page.getByRole('button', {name:'Keskeytä'}).click();
 const frozen = await page.locator('#time').textContent(); await page.clock.runFor(30000);
 await expect(page.locator('#time')).toHaveText(frozen);
 await page.getByRole('button', {name:'Jatka treeniä'}).click();
 await page.clock.runFor(20000); await expect(page.locator('#phase')).toHaveText('Lepo');
 await page.getByRole('button', {name:'Nollaa'}).click();
 await expect(page.locator('#time')).toHaveText('00:10');
 await expect(page.getByRole('button', {name:'Aloita treeni'})).toBeVisible();
});
test('validation and persistence', async ({page}) => {
 await page.goto(path); await page.getByLabel('Kierroksia').fill('0');
 await page.getByRole('button', {name:'Aloita treeni'}).click();
 await expect(page.locator('#error')).not.toBeEmpty();
 await page.getByLabel('Kierroksia').fill('4'); await page.getByLabel('Työ (s)').fill('30');
 await page.getByLabel('Lepo (s)').fill('0'); await page.getByLabel('Valmistautuminen (s)').fill('0');
 await page.getByLabel('Äänimerkit').check(); await page.reload();
 await expect(page.getByLabel('Kierroksia')).toHaveValue('4');
 await expect(page.getByLabel('Työ (s)')).toHaveValue('30');
 await expect(page.getByLabel('Äänimerkit')).toBeChecked();
 await page.getByRole('button', {name:'Aloita treeni'}).click(); await expect(page.locator('#phase')).toHaveText('Työ');
});
test('late browser callbacks catch up without replaying expired phases', async ({page}) => {
 await page.clock.install(); await page.goto(path);
 await page.getByRole('button', {name:'Aloita treeni'}).click();
 await page.clock.fastForward(201000);
 await expect(page.locator('#phase')).toHaveText('Työ');
 await expect(page.locator('#round')).toHaveText('Kierros 7 / 8');
 await expect(page.locator('#time')).toHaveText('00:09');
 await page.clock.fastForward(50000); await expect(page.locator('#phase')).toHaveText('Valmis!');
 await page.clock.runFor(1000); await expect(page.locator('#time')).toHaveText('00:00');
});
test('corrupt stored settings fall back and blocked storage does not break timer', async ({page}) => {
 await page.addInitScript(() => { localStorage.setItem('tabata-settings', '{broken'); });
 await page.goto(path); await expect(page.getByLabel('Kierroksia')).toHaveValue('8');
 await page.evaluate(() => { Storage.prototype.setItem = () => {throw new Error('blocked');}; });
 await page.getByRole('button', {name:'Aloita treeni'}).click();
 await expect(page.locator('#state-badge')).toHaveText('TREENI KÄYNNISSÄ');
 await expect(page.locator('#storage-warning')).toBeVisible();
});
test('optional audio emits cues only when enabled', async ({page}) => {
 await page.addInitScript(() => {
  window.beeps = 0;
  window.AudioContext = class {
   state = 'running'; currentTime = 0; destination = {};
   resume() { return Promise.resolve(); }
   createOscillator() { return {connect(){}, frequency:{value:0}, start(){window.beeps++;}, stop(){}}; }
   createGain() { return {connect(){},gain:{setValueAtTime(){},exponentialRampToValueAtTime(){}}}; }
  };
 });
 await page.clock.install(); await page.goto(path);
 await page.getByRole('button',{name:'Aloita treeni'}).click();
 await page.clock.runFor(1000); expect(await page.evaluate(() => beeps)).toBe(0);
 await page.getByLabel('Äänimerkit').check(); await page.clock.runFor(9000);
 expect(await page.evaluate(() => beeps)).toBeGreaterThanOrEqual(4);
 await page.getByLabel('Äänimerkit').uncheck();
 const count = await page.evaluate(() => beeps); await page.clock.runFor(20000);
 expect(await page.evaluate(() => beeps)).toBe(count);
});
test('mobile layout does not overflow', async ({page}) => {
 for (const width of [320,390,768,1280]) {
  await page.setViewportSize({width,height:844}); await page.goto(path);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
 }
});
