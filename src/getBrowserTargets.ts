import { getCompatibleVersions } from 'baseline-browser-mapping';
import { browserGroups } from './config.js';
import type { BrowserTargetsOptions } from './types.js';

function getOlderVersion(left: string, right: string): string {
  const leftParts = left.split('.').map(BigInt);
  const rightParts = right.split('.').map(BigInt);

  for (let index = 0; index < 3; index += 1) {
    const leftPart = leftParts[index] ?? 0n;
    const rightPart = rightParts[index] ?? 0n;

    if (leftPart !== rightPart) {
      return leftPart < rightPart ? left : right;
    }
  }

  return left;
}

function normalizeDate(widelyAvailableOnDate: unknown, widelyAvailableOnYear: unknown): string | undefined {
  if (widelyAvailableOnDate !== undefined && widelyAvailableOnYear !== undefined) {
    throw new TypeError('widelyAvailableOnDate and widelyAvailableOnYear cannot be used together.');
  }

  if (widelyAvailableOnYear !== undefined) {
    if (typeof widelyAvailableOnYear !== 'number' || !Number.isInteger(widelyAvailableOnYear)
      || widelyAvailableOnYear < 1 || widelyAvailableOnYear > 9999) {
      throw new TypeError('widelyAvailableOnYear must be an integer from 1 to 9999.');
    }

    return `${String(widelyAvailableOnYear).padStart(4, '0')}-12-31`;
  }

  if (widelyAvailableOnDate === undefined) {
    return undefined;
  }

  const message = 'widelyAvailableOnDate must be a valid Gregorian date in YYYY-MM-DD format (years 0001-9999).';

  if (typeof widelyAvailableOnDate !== 'string' || widelyAvailableOnDate.length !== 10
    || !/^\d{4}-\d{2}-\d{2}$/.test(widelyAvailableOnDate) || widelyAvailableOnDate.startsWith('0000')) {
    throw new TypeError(message);
  }

  const date = new Date(`${widelyAvailableOnDate}T00:00:00.000Z`);

  if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== widelyAvailableOnDate) {
    throw new TypeError(message);
  }

  return widelyAvailableOnDate;
}

export function getBrowserTargets(options: BrowserTargetsOptions = {}): Array<string> {
  const widelyAvailableOnDate = normalizeDate(options.widelyAvailableOnDate, options.widelyAvailableOnYear);
  const versions = getCompatibleVersions({ widelyAvailableOnDate });

  return Object.entries(browserGroups).map(([target, browsers]) => {
    const browserVersions = browsers.map((browser) => {
      const version = versions.find((entry) => entry.browser === browser)?.version;

      if (typeof version !== 'string' || version !== version.trim() || !/^\d+(?:\.\d+){0,2}$/.test(version)
        || /^0+(?:\.0+)*$/.test(version)) {
        throw new Error(`Invalid Baseline version for ${browser}: ${JSON.stringify(version)}`);
      }

      return version;
    });

    return `${target}${browserVersions.reduce(getOlderVersion)}`;
  });
}
