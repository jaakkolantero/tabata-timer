import test from 'node:test';
import assert from 'node:assert/strict';
import { Timer, DEFAULTS, validate } from '../timer.js';
test('pause freezes time; resume continues and reset restores preparation', () => {
 const t = new Timer(); t.start(1000); t.pause(3500);
 assert.equal(t.snapshot(100000).remaining, 7500);
 t.resume(100000); assert.equal(t.snapshot(101000).remaining, 6500);
 t.reset(); assert.equal(t.snapshot(102000).state, 'idle');
 assert.equal(t.snapshot(102000).remaining, 10000);
});
test('late callback skips every expired phase and completes', () => {
 const t = new Timer(); t.start(0);
 assert.equal(t.snapshot(211000).round, 7);
 assert.equal(t.snapshot(900000).state, 'finished');
});
test('validation rejects invalid numbers and permits zero rest/preparation', () => {
 assert.equal(validate(DEFAULTS), true);
 for (const value of [NaN, Infinity, 0, -1, 1.5, 100, '8']) assert.equal(validate({ ...DEFAULTS, rounds: value }), false);
 assert.equal(validate({ ...DEFAULTS, prepare: 0, rest: 0 }), true);
 assert.equal(validate({ ...DEFAULTS, work: 3601 }), false);
});
test('zero rest and preparation start immediately, single round ends without rest', () => {
 const t = new Timer({rounds: 1, work: 2, rest: 0, prepare: 0}); t.start(0);
 assert.equal(t.snapshot(0).phase, 'work');
 assert.equal(t.snapshot(2000).state, 'finished');
});
test('default sequence includes preparation and no final rest', () => {
 const timer = new Timer(DEFAULTS); timer.start(0);
 assert.equal(timer.snapshot(0).phase, 'prepare');
 assert.equal(timer.snapshot(10000).phase, 'work');
 assert.equal(timer.snapshot(30000).phase, 'rest');
 assert.equal(timer.snapshot(40000).round, 2);
 assert.equal(timer.snapshot(239999).phase, 'work');
 assert.equal(timer.snapshot(240000).state, 'finished');
 assert.equal(timer.snapshot(240100).phase, 'finished');
 assert.equal(timer.snapshot(250000).remaining, 0);
});
