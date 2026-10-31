import { resolvePeriod, inRange, type AnalyticsWindow } from '../entity/window';

/**
 * What a Product analytics read covers: the period (a preset length ending now,
 * or a calendar range in the admin's zone — the same rules every Analytics page
 * follows) and, optionally, one platform and one app version.
 */
export interface ProductFilterInput {
  days?: number | null;
  from?: string | null;
  to?: string | null;
  platform?: string | null;
  app_version?: string | null;
}

export interface ProductScope {
  window: AnalyticsWindow;
  platform: string | null;
  appVersion: string | null;
}

const PLATFORMS = new Set(['ios', 'android', 'web', 'mweb']);

/** The period and the narrowing a read was asked for; an unknown platform narrows nothing. */
export function productScope(input: ProductFilterInput | null | undefined, now = new Date()): ProductScope {
  const window = resolvePeriod({ days: input?.days, from: input?.from, to: input?.to }, now);
  const platform = input?.platform && PLATFORMS.has(input.platform) ? input.platform : null;
  const appVersion = input?.app_version?.trim() ? input.app_version.trim().slice(0, 40) : null;
  return { window, platform, appVersion };
}

/** The narrowing alone — what both events and sessions are matched on besides their time. */
export function narrowing(scope: ProductScope): Record<string, string> {
  return {
    ...(scope.platform ? { platform: scope.platform } : {}),
    ...(scope.appVersion ? { app_version: scope.appVersion } : {}),
  };
}

/** Events of the period, narrowed. */
export const eventMatch = (scope: ProductScope, from = scope.window.from, to = scope.window.to) => ({
  occurred_at: inRange(from, to),
  ...narrowing(scope),
});

/** Sessions that began in the period, narrowed. */
export const sessionMatch = (scope: ProductScope, from = scope.window.from, to = scope.window.to) => ({
  started_at: inRange(from, to),
  ...narrowing(scope),
});

/** The period the scope reports on, as ISO strings for the client. */
export const scopePeriod = (scope: ProductScope) => ({
  from: scope.window.from.toISOString(),
  to: scope.window.to.toISOString(),
  granularity: scope.window.granularity,
});
