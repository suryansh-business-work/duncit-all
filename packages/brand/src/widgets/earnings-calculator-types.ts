/** The shapes the `earnings-calculator` widget reads from its root's JSON. */

/** One person a pod pays (a tab). */
export interface EarnRole {
  key: string;
  label: string;
  /** The role named on its own, for the PDF. */
  name: string;
  /** The waterfall line that is this role's money. */
  field: string;
  takeHomeLabel: string;
  /** The waterfall line holding this role's rate; zero means "not set up". */
  rateField?: string;
  /** The slider whose value multiplies the per-pod figure. */
  multiplier?: string;
  /** Row keys shown in the breakdown, in order (see ROW_FIELD). */
  rows: string[];
  dutiesTitle: string;
  duties: string[];
}

/** One slider. */
export interface EarnField {
  name: string;
  label: string;
  prefix?: string;
  /** Only these roles show it; absent means every role. */
  roles?: string[];
}

/** `data-config`. */
export interface EarnConfig {
  roles: EarnRole[];
  fields: EarnField[];
  rowLabels: Record<string, string>;
  currency: string;
}

/** `data-copy`. */
export interface EarnCopy {
  note: string;
  shortfallNote: string;
  noShareNote: string;
  /** Shown when the first estimate could not be loaded. */
  loadError: string;
  disclaimer: string;
  pdf: {
    title: string;
    inputsTitle: string;
    breakdownTitle: string;
    footer: string;
    preparing: string;
    error: string;
    fileName: string;
  };
}

/** The server's settlement waterfall for one pod, by field name. */
export type Waterfall = Record<string, number>;

export interface Estimate {
  payable_spots: number;
  waterfall: Waterfall;
}

/** What the PDF needs from the live widget at the moment it is drawn. */
export interface EarnSnapshot {
  role: EarnRole;
  fields: EarnField[];
  rowLabels: Record<string, string>;
  copy: EarnCopy;
  /** The take-home exactly as the panel shows it. */
  takeHome: string;
  sliderValue: (name: string) => number;
  rowText: (key: string) => string;
}
