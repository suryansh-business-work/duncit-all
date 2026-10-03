import type { DnsDomainInfo } from '@duncit/gql-types';

/**
 * How close the domain is to lapsing.
 *
 * A registration is the one thing on this page that stops working on a date
 * rather than because somebody changed it, so the page leads with how long is
 * left and says it in a colour before it says it in a number.
 */
export type ExpiryLevel = 'EXPIRED' | 'CRITICAL' | 'SOON' | 'HEALTHY' | 'UNKNOWN';

/** Inside a month is the last point a transfer or a payment problem can still be fixed calmly. */
const CRITICAL_DAYS = 30;
const SOON_DAYS = 90;

/** Days-left boundaries for a level; a 90-day TLS certificate needs tighter ones than a domain. */
export interface ExpiryThresholds {
  critical: number;
  soon: number;
}

export function expiryLevel(
  days: number | null | undefined,
  thresholds: ExpiryThresholds = { critical: CRITICAL_DAYS, soon: SOON_DAYS },
): ExpiryLevel {
  if (days === null || days === undefined) return 'UNKNOWN';
  if (days < 0) return 'EXPIRED';
  if (days <= thresholds.critical) return 'CRITICAL';
  if (days <= thresholds.soon) return 'SOON';
  return 'HEALTHY';
}

/** Theme colour path for a level. Anything not healthy is loud on purpose. */
export const EXPIRY_COLOR: Readonly<Record<ExpiryLevel, string>> = {
  EXPIRED: 'error.main',
  CRITICAL: 'error.main',
  SOON: 'warning.main',
  HEALTHY: 'success.main',
  UNKNOWN: 'text.secondary',
};

/**
 * Auto-renew off is only reassuring when the expiry is far away — near the
 * deadline it is the reason the domain is about to go.
 */
export const renewWarning = (info: Readonly<DnsDomainInfo>): boolean =>
  info.renew_auto === false && expiryLevel(info.days_to_expiry) !== 'HEALTHY';
