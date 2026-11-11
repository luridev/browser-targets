# @protoapps/browser-targets

Baseline Widely Available browser targets for build tools such as Vite, powered by [baseline-browser-mapping](https://github.com/web-platform-dx/baseline-browser-mapping).

```sh
npm install -D @protoapps/browser-targets
```

## Usage

```ts
import { getBrowserTargets } from '@protoapps/browser-targets';

// Current Baseline Widely Available
getBrowserTargets();

// Fixed date
getBrowserTargets({ widelyAvailableOnDate: '2026-09-25' });

// End of year (equivalent to 2025-12-31)
getBrowserTargets({ widelyAvailableOnYear: 2025 });
```

Returns a `string[]` of browser targets (`chrome`, `edge`, `firefox`, `safari`, `ios`) suitable for Vite's `build.target` and similar tools.

## Options

- `widelyAvailableOnDate` — a valid date in `YYYY-MM-DD` format.
- `widelyAvailableOnYear` — an integer year (`1–9999`), resolved to December 31 of that year.

Options are mutually exclusive. Invalid inputs or unavailable browser versions throw an error.

Without options, the policy uses the current date. A fixed date does not guarantee identical results after updating `baseline-browser-mapping`.

Requires Node.js 22 or newer.
