import assert from 'node:assert/strict';
import * as api from '@protoapps/browser-targets';

assert.deepEqual(Object.keys(api), ['getBrowserTargets']);

const rolling = api.getBrowserTargets();
const frozen = api.getBrowserTargets({ widelyAvailableOnDate: '2026-09-25' });
const families = ['chrome', 'edge', 'firefox', 'safari', 'ios'];

for (const targets of [rolling, frozen]) {
  assert.ok(Array.isArray(targets));
  assert.equal(targets.length, families.length);

  for (const [index, family] of families.entries()) {
    assert.match(targets[index], new RegExp(`^${family}\\d+(?:\\.\\d+){0,2}$`));
  }
}

assert.throws(() => api.getBrowserTargets({ widelyAvailableOnDate: 'not-a-date' }), Error);

process.stdout.write(`${JSON.stringify({ node: process.version, rolling, frozen, invalidDateRejected: true }, null, 2)}\n`);
