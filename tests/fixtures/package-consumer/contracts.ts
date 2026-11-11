import { getBrowserTargets } from '@protoapps/browser-targets';
import type { BrowserTargetsOptions } from '@protoapps/browser-targets';

const options: BrowserTargetsOptions = { widelyAvailableOnDate: '2026-09-25' };
const yearOptions: BrowserTargetsOptions = { widelyAvailableOnYear: 2025 };

export const rolling: string[] = getBrowserTargets();
export const emptyOptions: string[] = getBrowserTargets({});
export const frozen: string[] = getBrowserTargets(options);
export const year: string[] = getBrowserTargets(yearOptions);

// @ts-expect-error -- The public API accepts date strings, not timestamps.
getBrowserTargets({ widelyAvailableOnDate: 0 });
// @ts-expect-error -- A date and a year are mutually exclusive.
getBrowserTargets({ widelyAvailableOnDate: '2025-09-25', widelyAvailableOnYear: 2025 });
// @ts-expect-error -- Upstream configuration is not part of this adapter's API.
getBrowserTargets({ targetYear: 2020 });
