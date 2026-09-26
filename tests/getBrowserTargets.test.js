import assert from 'node:assert/strict';
import { after, beforeEach, mock, test } from 'node:test';

const upstream = mock.fn();

mock.module('baseline-browser-mapping', {
  namedExports: { getCompatibleVersions: upstream },
});

const { getBrowserTargets } = await import('@protoapps/browser-targets');
let versions;

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
  upstream.mock.resetCalls();
  upstream.mock.mockImplementation(() => versions);
});

after(() => mock.restoreAll());

test('selects core browsers, preserving versions and mapping mobile Safari to ios', () => {
  assert.deepEqual(getBrowserTargets(), [
    'chrome100', 'edge101', 'firefox102.15', 'safari17.1', 'ios17.2.1',
  ]);
  assert.deepEqual(upstream.mock.calls[0].arguments, [{ widelyAvailableOnDate: undefined }]);
});

test('collapses different desktop and Android versions to the older targets', () => {
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

test('compares numeric components and treats missing components as zero', () => {
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

test('forwards the frozen snapshot date to upstream', () => {
  getBrowserTargets({ widelyAvailableOnDate: '2026-09-25' });

  assert.deepEqual(upstream.mock.calls[0].arguments, [{ widelyAvailableOnDate: '2026-09-25' }]);
});

test('fails when a required core browser is missing', () => {
  const completeVersions = versions;

  for (const browser of ['chrome', 'chrome_android', 'edge', 'firefox', 'firefox_android', 'safari', 'safari_ios']) {
    versions = completeVersions.filter((entry) => entry.browser !== browser);

    assert.throws(() => getBrowserTargets(), { message: `Invalid Baseline version for ${browser}: undefined` });
  }
});

test('rejects empty, malformed and whitespace-containing versions, including Android entries', () => {
  for (const browser of ['chrome', 'chrome_android', 'firefox_android']) {
    for (const version of ['', '17.x', 'v17.4', '17.4beta', ' 17.4', '17.4\n', '17.4.1.2']) {
      const invalidVersions = versions.map((entry) => entry.browser === browser ? { ...entry, version } : entry);

      upstream.mock.mockImplementation(() => invalidVersions);
      assert.throws(() => getBrowserTargets(), {
        message: `Invalid Baseline version for ${browser}: ${JSON.stringify(version)}`,
      });
    }
  }
});
