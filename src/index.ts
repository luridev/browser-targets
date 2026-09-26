import { getCompatibleVersions } from 'baseline-browser-mapping';

const browserGroups = {
  chrome: ['chrome', 'chrome_android'],
  edge: ['edge'],
  firefox: ['firefox', 'firefox_android'],
  safari: ['safari'],
  ios: ['safari_ios'],
};

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

export type BrowserTargetsOptions = {
  widelyAvailableOnDate?: string;
};

export function getBrowserTargets(options: BrowserTargetsOptions = {}): Array<string> {
  const versions = getCompatibleVersions({ widelyAvailableOnDate: options.widelyAvailableOnDate });

  return Object.entries(browserGroups).map(([target, browsers]) => {
    const browserVersions = browsers.map((browser) => {
      const version = versions.find((entry) => entry.browser === browser)?.version;

      if (typeof version !== 'string' || version !== version.trim() || !/^\d+(?:\.\d+){0,2}$/.test(version)) {
        throw new Error(`Invalid Baseline version for ${browser}: ${JSON.stringify(version)}`);
      }

      return version;
    });

    return `${target}${browserVersions.reduce(getOlderVersion)}`;
  });
}
