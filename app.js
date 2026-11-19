import { Timer, validate } from './timer.js';
import { WakeKeeper } from './wake-lock.js';
import { setupPWA } from './pwa.js';
const $ = id => document.getElementById(id);
const wake = new WakeKeeper((message, status, retry) => {
 $('wake-status').textContent = message;
 document.querySelector('.wake-row').dataset.status = status;
 $('wake-retry').hidden = !retry;
});
$('wake-retry').addEventListener('click', () => wake.acquire());
const inputs = ['rounds', 'work', 'rest', 'prepare'];
let saved;
try { saved = JSON.parse(localStorage.getItem('tabata-settings')); } catch { /* Defaults also cover corrupt storage. */ }
if (saved && validate(saved)) inputs.forEach(key => { $(key).value = saved[key]; });
$('sound').checked = saved?.sound === true;
const readSettings = () => Object.fromEntries(inputs.map(key => [key, $(key).value === '' ? NaN : Number($(key).value)]));
let timer = new Timer(readSettings());
const syncUpdate = setupPWA(() => timer.state === 'running' || timer.state === 'paused');
const format = ms => { const sec = Math.ceil(ms / 1000); return `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`; };
const names = { prepare: 'Valmistaudu', work: 'Työ', rest: 'Lepo', finished: 'Valmis!' };
let lastAnnouncement = '', lastCue = '', audio;
function save() {
 const settings = readSettings();
 if (!validate(settings)) return false;
 try { localStorage.setItem('tabata-settings', JSON.stringify({...settings, sound: $('sound').checked})); }
 catch { $('storage-warning').hidden = false; }
 return true;
}
function checkSettings() {
 let valid = true;
 for (const key of inputs) { const field = $(key); const ok = field.checkValidity(); field.setAttribute('aria-invalid', String(!ok)); valid &&= ok; }
 $('error').textContent = valid ? '' : 'Anna kokonaisluvut: kierroksia 1–99, työ 1–3600 s, lepo ja valmistautuminen 0–3600 s.';
 return valid && validate(readSettings());
}
function unlockAudio() {
 if (!$('sound').checked) return;
 try { audio ||= new (window.AudioContext || window.webkitAudioContext)(); audio.resume().catch(audioError); }
 catch { audioError(); }
}
function audioError() { $('audio-warning').hidden = false; $('audio-warning').textContent = 'Äänimerkit eivät ole käytettävissä. Seuraa ajastinta näytöltä.'; }
function beep(frequency = 740) {
 if (!$('sound').checked || !audio || audio.state !== 'running' || document.hidden) return;
 try { const osc = audio.createOscillator(), gain = audio.createGain(); osc.connect(gain); gain.connect(audio.destination); osc.frequency.value = frequency; gain.gain.setValueAtTime(.12, audio.currentTime); gain.gain.exponentialRampToValueAtTime(.001, audio.currentTime + .16); osc.start(); osc.stop(audio.currentTime + .17); } catch { audioError(); }
}
function render() {
 const s = timer.snapshot(Date.now());
 wake.setRunning(s.state === 'running');
 syncUpdate();
 $('phase').textContent = names[s.phase]; $('time').textContent = format(s.remaining);
 $('round').textContent = s.phase === 'prepare' ? 'Ennen ensimmäistä kierrosta' : `Kierros ${s.round} / ${timer.settings.rounds}`;
 document.querySelector('.timer-card').dataset.phase = s.phase;
 $('state-badge').textContent = { idle: 'VALMIS ALOITTAMAAN', running: 'TREENI KÄYNNISSÄ', paused: 'TAUKO', finished: 'HYVÄ SINÄ!' }[s.state];
 $('start').textContent = { idle: 'Aloita treeni', running: 'Keskeytä', paused: 'Jatka treeniä', finished: 'Uusi treeni' }[s.state];
 $('fields').disabled = s.state === 'running' || s.state === 'paused';
 $('total').textContent = `${s.state === 'idle' ? 'Yhteensä' : 'Jäljellä'} ${format(s.total - s.elapsed)}`;
 const next = timer.phases[s.index + 1];
 $('next').textContent = next ? `Seuraavaksi: ${names[next.phase].toLowerCase()}` : s.state === 'finished' ? 'Treeni tehty. Nauti olosta.' : 'Viimeinen työjakso';
 const progress = Math.round(s.elapsed / s.total * 100);
 $('progress-fill').style.width = `${progress}%`; document.querySelector('.progress').setAttribute('aria-valuenow', progress);
 $('dots').replaceChildren(...Array.from({length: Math.min(timer.settings.rounds, 20)}, (_, i) => { const dot = document.createElement('span'); dot.className = `dot${i < s.round || s.state === 'finished' ? ' done' : ''}${i === s.round - 1 && s.state !== 'finished' ? ' current' : ''}`; return dot; }));
 const announcement = `${s.state}:${s.index}`;
 if (announcement !== lastAnnouncement) { $('announcement').textContent = `${names[s.phase]}. ${s.state === 'paused' ? 'Ajastin pysäytetty.' : $('round').textContent}`; lastAnnouncement = announcement; }
 const cue = `${s.index}:${Math.ceil(s.remaining / 1000)}`;
 if (cue !== lastCue && (s.state === 'running' || s.state === 'finished')) {
  if (!lastCue.startsWith(`${s.index}:`) || s.remaining <= 3000) beep(s.phase === 'work' ? 880 : 600);
  lastCue = cue;
 }
}
$('settings').addEventListener('submit', e => e.preventDefault());
inputs.forEach(key => $(key).addEventListener('input', () => {
 if (checkSettings()) { save(); timer = new Timer(readSettings()); render(); }
}));
$('sound').addEventListener('change', () => { save(); unlockAudio(); });
$('start').addEventListener('click', () => {
 if (timer.state === 'running') timer.pause(Date.now());
 else if (timer.state === 'paused') { unlockAudio(); timer.resume(Date.now()); }
 else { if (!checkSettings()) { inputs.find(key => !$(key).checkValidity()) && $(inputs.find(key => !$(key).checkValidity())).focus(); return; } save(); timer = new Timer(readSettings()); unlockAudio(); lastCue = ''; timer.start(Date.now()); }
 render();
});
$('reset').addEventListener('click', () => { timer.reset(); lastCue = ''; render(); });
setInterval(render, 100);
document.addEventListener('visibilitychange', render);
render();
