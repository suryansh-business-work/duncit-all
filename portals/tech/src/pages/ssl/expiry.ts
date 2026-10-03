import type { SslCoverage } from '@duncit/gql-types';
import { expiryLevel, type ExpiryLevel } from '../domain/overview/expiry';

/**
 * certbot's timer renews a Let's Encrypt certificate once 30 days are left, so a
 * certificate still under 30 days means that renewal has not happened yet, and
 * under two weeks means it has been failing for a while.
 */
const SSL_THRESHOLDS = { critical: 14, soon: 30 } as const;

export const sslExpiryLevel = (days: number): ExpiryLevel => expiryLevel(days, SSL_THRESHOLDS);

/** MUI Chip colour for a level. */
export const LEVEL_CHIP: Readonly<Record<ExpiryLevel, 'error' | 'warning' | 'success' | 'default'>> = {
  EXPIRED: 'error',
  CRITICAL: 'error',
  SOON: 'warning',
  HEALTHY: 'success',
  UNKNOWN: 'default',
};

/** Localisation key per coverage, written out in full for the shipped-key gate. */
export const COVERAGE_KEY: Readonly<Record<SslCoverage, string>> = {
  SINGLE: 'tech.ssl.coverageSingle',
  MULTI: 'tech.ssl.coverageMulti',
  WILDCARD: 'tech.ssl.coverageWildcard',
};
