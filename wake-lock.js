// Each request belongs to an epoch. A late result must never outlive its workout.
export class WakeKeeper {
 constructor(report, nav = navigator, doc = document) {
  this.nav = nav; this.doc = doc; this.report = report; this.desired = false;
  this.epoch = 0; this.lock = null; this.pending = false;
  doc.addEventListener('visibilitychange', () => {
   if (!this.desired) return;
   this.epoch++;
   if (doc.visibilityState === 'visible') this.acquire();
   else { this.release(); this.warn('Sovellus on taustalla.'); }
  });
 }
 warn(reason) { this.report(`${reason} Näyttö voi sammua. Pidä sovellus näkyvissä ja tarkista virransäästö.`, 'warning', Boolean(this.nav.wakeLock)); }
 setRunning(running) {
  if (this.desired === running) return;
  this.desired = running; this.epoch++;
  if (running) this.acquire();
  else { this.release(); this.report('Näytön hereilläpito ei ole käytössä. Treeni ei ole käynnissä.', 'idle', false); }
 }
 release() {
  const lock = this.lock; this.lock = null;
  if (lock) lock.release().catch(() => { if (this.desired) this.warn('Hereilläpidon vapautus epäonnistui.'); });
 }
 async acquire() {
  if (!this.desired || this.doc.visibilityState !== 'visible' || this.lock || this.pending) return;
  if (!this.nav.wakeLock?.request) { this.warn('Selain ei tue näytön hereilläpitoa.'); return; }
  const epoch = this.epoch; this.pending = true;
  this.report('Näytön hereilläpitoa pyydetään…', 'pending', false);
  try {
   const lock = await this.nav.wakeLock.request('screen');
   if (epoch !== this.epoch || !this.desired || this.doc.visibilityState !== 'visible') { await lock.release(); return; }
   if (lock.released) { this.warn('Selain vapautti hereilläpidon.'); return; }
   this.lock = lock;
   lock.addEventListener('release', () => {
    if (this.lock !== lock) return;
    this.lock = null;
    if (this.desired) this.warn('Näytön hereilläpito vapautui.');
   });
   this.report('Näytön hereilläpito aktiivinen. Käyttöjärjestelmä voi silti keskeyttää sen.', 'active', false);
  } catch { if (epoch === this.epoch && this.desired) this.warn('Näytön hereilläpitoa ei saatu käyttöön.'); }
  finally {
   this.pending = false;
   if (epoch !== this.epoch && this.desired) this.acquire();
  }
 }
}
