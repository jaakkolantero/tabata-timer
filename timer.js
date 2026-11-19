export const DEFAULTS = Object.freeze({ rounds: 8, work: 20, rest: 10, prepare: 10 });
export function validate(settings) {
 const limits = { rounds: [1, 99], work: [1, 3600], rest: [0, 3600], prepare: [0, 3600] };
 return Object.entries(limits).every(([key, [min, max]]) => Number.isInteger(settings[key]) && settings[key] >= min && settings[key] <= max);
}
export class Timer {
 constructor(settings = DEFAULTS) {
  this.settings = { ...settings };
  this.phases = [];
  const add = (phase, seconds, round) => { if (seconds) this.phases.push({ phase, duration: seconds * 1000, round }); };
  add('prepare', settings.prepare, 0);
  for (let round = 1; round <= settings.rounds; round++) {
   add('work', settings.work, round);
   if (round < settings.rounds) add('rest', settings.rest, round);
  }
  this.total = this.phases.reduce((sum, p) => sum + p.duration, 0);
  this.state = 'idle'; this.elapsed = 0;
 }
 start(now) { this.started = now; this.state = 'running'; }
 pause(now) {
  if (this.state !== 'running') return;
  const current = this.snapshot(now); this.elapsed = current.elapsed;
  if (this.state !== 'finished') this.state = 'paused';
 }
 resume(now) { if (this.state === 'paused') this.start(now); }
 reset() { this.state = 'idle'; this.elapsed = 0; }
 snapshot(now) {
  const elapsed = Math.min(this.total, this.elapsed + (this.state === 'running' ? Math.max(0, now - this.started) : 0));
  if (elapsed >= this.total) { this.state = 'finished'; this.elapsed = this.total; }
  let left = elapsed;
  let index = 0;
  for (const phase of this.phases) {
   if (left < phase.duration) return { ...phase, state: this.state, remaining: phase.duration - left, elapsed, index, total: this.total };
   left -= phase.duration; index++;
  }
  return { phase: 'finished', state: this.state, remaining: 0, elapsed: this.total, total: this.total, round: this.settings.rounds, index };
 }
}
