export type BrowserTargetsOptions =
  | {
    widelyAvailableOnDate?: string;
    widelyAvailableOnYear?: never;
  }
  | {
    widelyAvailableOnDate?: never;
    widelyAvailableOnYear: number;
  };
