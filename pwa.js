export function setupPWA(isBusy) {
 const status = document.getElementById('offline-status');
 const update = document.getElementById('update');
 let registration, requestedReload = false;
 if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js', {scope:'./', updateViaCache:'none'}).then(reg => {
   registration = reg;
   const waiting = () => { update.hidden = !(reg.waiting && navigator.serviceWorker.controller); };
   waiting();
   reg.addEventListener('updatefound', () => {
    const worker = reg.installing;
    worker?.addEventListener('statechange', () => {
     if (worker.state === 'installed') waiting();
     if (worker.state === 'redundant' && !navigator.serviceWorker.controller) status.textContent = 'Offline-tallennus epäonnistui. Yritä myöhemmin uudelleen.';
    });
   });
   navigator.serviceWorker.ready.then(() => { status.textContent = 'Valmis offline-käyttöön'; });
  }).catch(() => { status.textContent = 'Offline-käyttö ei ole saatavilla tässä selaimessa.'; });
  navigator.serviceWorker.addEventListener('controllerchange', () => {
   update.hidden = !registration?.waiting;
   // Another tab may activate an update. Never interrupt this tab's workout.
   if (requestedReload && !isBusy()) location.reload();
  });
 } else status.textContent = 'Selain ei tue offline-käyttöä.';
 update.addEventListener('click', () => {
  if (isBusy() || !registration?.waiting) return;
  requestedReload = true;
  registration.waiting.postMessage({type:'APPLY_UPDATE'});
 });
 const install = document.getElementById('install');
 let installEvent;
 window.addEventListener('beforeinstallprompt', e => { e.preventDefault(); installEvent = e; install.hidden = false; });
 install.addEventListener('click', async () => {
  if (!installEvent) return;
  try { await installEvent.prompt(); await installEvent.userChoice; } finally { installEvent = null; install.hidden = true; }
 });
 window.addEventListener('appinstalled', () => { install.hidden = true; });
 return () => { update.disabled = isBusy(); update.title = isBusy() ? 'Päivitä vasta treenin päätyttyä tai nollauksen jälkeen.' : 'Asenna uusi versio ja lataa sivu uudelleen'; };
}
