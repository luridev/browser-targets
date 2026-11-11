import assert from 'node:assert/strict';
import * as api from '@protoapps/browser-targets';

assert.deepEqual(Object.keys(api), ['getBrowserTargets']);

const rolling = api.getBrowserTargets();
const frozen = api.getBrowserTargets({ widelyAvailableOnDate: '2026-09-25' });
const year = api.getBrowserTargets({ widelyAvailableOnYear: 2025 });
const yearEnd = api.getBrowserTargets({ widelyAvailableOnDate: '2025-12-31' });
const families = ['chrome', 'edge', 'firefox', 'safari', 'ios'];

assert.deepEqual(year, yearEnd);

for (const targets of [rolling, frozen, year]) {
  assert.ok(Array.isArray(targets));
  assert.equal(targets.length, families.length);

  for (const [index, family] of families.entries()) {
    assert.match(targets[index], new RegExp(`^${family}\\d+(?:\\.\\d+){0,2}$`));
  }
}

assert.throws(() => api.getBrowserTargets({ widelyAvailableOnDate: 'not-a-date' }), Error);

process.stdout.write(`${JSON.stringify({ node: process.version, rolling, frozen, year, invalidDateRejected: true }, null, 2)}\n`);
