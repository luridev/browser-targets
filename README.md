# @protoapps/browser-targets

Core browser targets for build tools such as Vite/Oxc, backed by [baseline-browser-mapping](https://github.com/web-platform-dx/baseline-browser-mapping).

```sh
npm install --save-dev @protoapps/browser-targets
```

## Application

```ts
import { getBrowserTargets } from '@protoapps/browser-targets';

getBrowserTargets();
```

The default is rolling Baseline Widely Available, based on the current date and installed mapping data.

## Versioned library

```ts
import { getBrowserTargets } from '@protoapps/browser-targets';

getBrowserTargets({ widelyAvailableOnDate: '2026-09-25' });
```

A date (`YYYY-MM-DD`) selects a frozen Baseline snapshot. Change it deliberately when changing a library's browser requirements.

Returns five targets from seven Baseline core browser entries: Chrome and Chrome Android share a `chrome` target; Firefox and Firefox Android share `firefox`. Each pair uses its older version. Edge and Safari keep their own targets, and `safari_ios` becomes `ios`. Downstream browsers are excluded.

The result is `string[]`, usable as `build.target` in Vite. Missing or invalid core browser versions throw an error. Requires Node.js 22 or newer.
