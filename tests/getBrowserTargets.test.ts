import assert from 'node:assert/strict';
import { afterAll, beforeAll, beforeEach, describe, it, vi } from 'vitest';
import type { getCompatibleVersions } from 'baseline-browser-mapping';
import type { BrowserTargetsOptions, getBrowserTargets as getBrowserTargetsApi } from '@protoapps/browser-targets';

describe('getBrowserTargets', () => {
  const upstream = vi.fn<typeof getCompatibleVersions>();
  let versions: ReturnType<typeof getCompatibleVersions>;
  let getBrowserTargets: typeof getBrowserTargetsApi;

  beforeAll(async () => {
    vi.resetModules();
    vi.doMock(import('baseline-browser-mapping'), () => ({ getCompatibleVersions: upstream }));
    ({ getBrowserTargets } = await import('@protoapps/browser-targets'));
  });

  beforeEach(() => {
    versions = [
      { browser: 'safari_ios', version: '17.2.1' },
      { browser: 'chrome_android', version: '100' },
      { browser: 'firefox', version: '102.15' },
      { browser: 'safari', version: '17.1' },
      { browser: 'edge', version: '101' },
      { browser: 'chrome', version: '100' },
      { browser: 'firefox_android', version: '102.15' },
      { browser: 'samsunginternet_android', version: '22' },
    ];

    upstream.mockReset();
    upstream.mockImplementation(() => versions);
  });

  afterAll(() => {
    vi.doUnmock('baseline-browser-mapping');
    vi.resetModules();
  });

  it('selects core browsers, preserving versions and mapping mobile Safari to ios', () => {
    assert.deepEqual(getBrowserTargets(), [
      'chrome100', 'edge101', 'firefox102.15', 'safari17.1', 'ios17.2.1',
    ]);

    assert.deepEqual(upstream.mock.calls[0], [{ widelyAvailableOnDate: undefined }]);
  });

  it('collapses different desktop and Android versions to the older targets', () => {
    versions = [
      { browser: 'chrome', version: '123' },
      { browser: 'chrome_android', version: '122' },
      { browser: 'edge', version: '124' },
      { browser: 'firefox', version: '124' },
      { browser: 'firefox_android', version: '123' },
      { browser: 'safari', version: '17.4' },
      { browser: 'safari_ios', version: '17.3' },
    ];

    assert.deepEqual(getBrowserTargets(), [
      'chrome122', 'edge124', 'firefox123', 'safari17.4', 'ios17.3',
    ]);
  });

  it('compares numeric components and treats missing components as zero', () => {
    for (const [desktop, mobile, expected] of [
      ['99', '100', '99'],
      ['123.1', '124', '123.1'],
      ['123.10', '123.9', '123.9'],
      ['123.1.10', '123.1.2', '123.1.2'],
      ['123.0.1', '123', '123'],
      ['123.1.0', '123.1', '123.1.0'],
    ]) {
      versions = versions.map((entry) => {
        if (entry.browser === 'chrome' || entry.browser === 'firefox') {
          return { ...entry, version: desktop };
        }

        if (entry.browser === 'chrome_android' || entry.browser === 'firefox_android') {
          return { ...entry, version: mobile };
        }

        return entry;
      });

      const targets = getBrowserTargets();

      assert.equal(targets[0], `chrome${expected}`, `${desktop} vs ${mobile}`);
      assert.equal(targets[2], `firefox${expected}`, `${desktop} vs ${mobile}`);
    }
  });

  it.each([
    '2026-09-25', '2024-02-29', '2000-02-29', '1900-02-28', '0001-01-01', '0099-12-31', '9999-12-31',
  ])('accepts the Gregorian date %s without changing it', (date) => {
    getBrowserTargets({ widelyAvailableOnDate: date });

    assert.deepEqual(upstream.mock.calls[0], [{ widelyAvailableOnDate: date }]);
  });

  it.each([
    '', 'not-a-date', '2025-1-1', '2025-09-25T12:00:00Z', '2025-09-25\n', ' 2025-09-25',
    '2025-02-29', '2026-02-30', '1900-02-29', '2100-02-29', '2025-04-31',
    '2025-00-01', '2025-13-01', '2025-01-00', '2025-01-32', '0000-01-01',
    2025, null, false,
  ])('rejects the invalid date %j before calling upstream', (date) => {
    const options = { widelyAvailableOnDate: date } as BrowserTargetsOptions;

    assert.throws(() => getBrowserTargets(options), { name: 'TypeError', message: /widelyAvailableOnDate/ });
    assert.equal(upstream.mock.calls.length, 0);
  });

  it.each([
    [1, '0001-12-31'],
    [99, '0099-12-31'],
    [2025, '2025-12-31'],
    [9999, '9999-12-31'],
  ] as const)('normalizes year %i to December 31', (year, date) => {
    getBrowserTargets({ widelyAvailableOnYear: year });

    assert.deepEqual(upstream.mock.calls[0], [{ widelyAvailableOnDate: date }]);
  });

  it.each([0, -1, 10000, NaN, Infinity, -Infinity, 2025.5, '2025', null, false])(
    'rejects the invalid year %j before calling upstream', (year) => {
      const options = { widelyAvailableOnYear: year } as BrowserTargetsOptions;

      assert.throws(() => getBrowserTargets(options), { name: 'TypeError', message: /widelyAvailableOnYear/ });
      assert.equal(upstream.mock.calls.length, 0);
    },
  );

  it('rejects a date and year supplied together before calling upstream', () => {
    const options = { widelyAvailableOnDate: '2025-09-25', widelyAvailableOnYear: 2025 } as unknown as BrowserTargetsOptions;

    assert.throws(() => getBrowserTargets(options), {
      name: 'TypeError', message: /widelyAvailableOnDate.*widelyAvailableOnYear/,
    });

    assert.equal(upstream.mock.calls.length, 0);
  });

  it.each([{}, { widelyAvailableOnDate: undefined }])('preserves rolling targets for options %j', (options) => {
    const rolling = getBrowserTargets();
    const targets = getBrowserTargets(options);

    assert.deepEqual(targets, rolling);
    assert.deepEqual(upstream.mock.calls[1], [{ widelyAvailableOnDate: undefined }]);
  });

  it('fails when a required core browser is missing', () => {
    const completeVersions = versions;

    for (const browser of ['chrome', 'chrome_android', 'edge', 'firefox', 'firefox_android', 'safari', 'safari_ios']) {
      versions = completeVersions.filter((entry) => entry.browser !== browser);

      assert.throws(() => getBrowserTargets(), { message: `Invalid Baseline version for ${browser}: undefined` });
    }
  });

  it('rejects empty, malformed, zero and whitespace-containing versions, including Android entries', () => {
    for (const browser of ['chrome', 'chrome_android', 'firefox_android']) {
      for (const version of ['', '17.x', 'v17.4', '17.4beta', ' 17.4', '17.4\n', '17.4.1.2', '0', '0.0', '0.0.0', '00.00.00']) {
        const invalidVersions = versions.map((entry) => entry.browser === browser ? { ...entry, version } : entry);

        upstream.mockImplementation(() => invalidVersions);

        assert.throws(() => getBrowserTargets(), {
          message: `Invalid Baseline version for ${browser}: ${JSON.stringify(version)}`,
        });
      }
    }
  });

  it.each(['17', '17.4', '17.4.1', '17.0', '17.0.0', '17.0.1'])('preserves the nonzero version %s', (version) => {
    versions = versions.map((entry) => entry.browser === 'safari' ? { ...entry, version } : entry);

    const targets = getBrowserTargets();

    assert.equal(targets[3], `safari${version}`);
  });
});
