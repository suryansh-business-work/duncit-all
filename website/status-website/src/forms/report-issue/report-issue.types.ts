import type { StatusReportImpact } from '../../types';

export interface ReportIssueValues {
  service_key: string;
  impact: StatusReportImpact;
  name: string;
  email: string;
  page_url: string;
  message: string;
}

export interface ImpactOption {
  value: StatusReportImpact;
  labelKey: string;
}

/**
 * The impact vocabulary, as VALUE + KEY pairs.
 *
 * Written out rather than composed from the enum (`status.impact.${value}`)
 * on purpose: the localization gate reads literal keys, and a key it cannot
 * see is a key nothing seeds into Localization — so the dropdown would render
 * raw `status.impact.SLOW` text in every language including the default.
 */
export const IMPACT_OPTIONS: readonly ImpactOption[] = [
  { value: 'CANNOT_ACCESS', labelKey: 'status.impact.cannotAccess' },
  { value: 'ERRORS', labelKey: 'status.impact.errors' },
  { value: 'SLOW', labelKey: 'status.impact.slow' },
  { value: 'LOGIN', labelKey: 'status.impact.login' },
  { value: 'PAYMENT', labelKey: 'status.impact.payment' },
  { value: 'OTHER', labelKey: 'status.impact.other' },
];

/** Empty service key means "not sure" — the server keeps it that way. */
export const REPORT_DEFAULTS: ReportIssueValues = {
  service_key: '',
  impact: 'CANNOT_ACCESS',
  name: '',
  email: '',
  page_url: '',
  message: '',
};

export const MESSAGE_MIN = 10;
export const MESSAGE_MAX = 4000;
export const NAME_MAX = 120;
export const URL_MAX = 500;
