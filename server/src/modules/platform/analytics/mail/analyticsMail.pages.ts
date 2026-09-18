import { PORTAL_REGISTRY } from '@modules/platform/portalMode/portalMode.registry';
import { getStatusEnvironment } from '@observability/statusServices';
import type { AnalyticsEntity } from '../entity/shapes';

/**
 * Each dashboard a report can cover: the console route a section links back
 * to, and the `analytics.page.<copy>` namespace its heading is read from.
 *
 * The console's route table is `portals/analytics/src/pages/entity-analytics/
 * pages.ts`. The server cannot import it (no `@duncit/*` dependency, rule 40),
 * so the two paths per dashboard live here as data — a renamed route that is
 * not changed here sends readers to the console's home page, not to an error.
 */
export const ANALYTICS_MAIL_PAGES: Readonly<Record<AnalyticsEntity, { path: string; copy: string }>> = {
  USERS: { path: '/users', copy: 'users' },
  PODS: { path: '/pods', copy: 'pods' },
  CLUBS: { path: '/clubs', copy: 'clubs' },
  CLUB_ADMINS: { path: '/club-admins', copy: 'clubAdmins' },
  HOSTS: { path: '/hosts', copy: 'hosts' },
  DATABASE: { path: '/tech/database', copy: 'database' },
  ENV_KEYS: { path: '/tech/env-keys', copy: 'envKeys' },
  SONARQUBE: { path: '/security/sonarqube', copy: 'sonarqube' },
  TEST_COVERAGE: { path: '/testing/unit-coverage', copy: 'coverage' },
  STRESS_TESTS: { path: '/testing/stress', copy: 'stress' },
  E2E_TESTS: { path: '/testing/e2e', copy: 'e2e' },
};

/** Every dashboard, in sidebar order — a report's sections follow it whatever order they were ticked in. */
export const ANALYTICS_ENTITIES = Object.keys(ANALYTICS_MAIL_PAGES) as AnalyticsEntity[];

const ENTITY_SET = new Set<string>(ANALYTICS_ENTITIES);

export const isAnalyticsEntity = (value: string): value is AnalyticsEntity => ENTITY_SET.has(value);

/** The reporting periods the dashboards offer; a report uses the same four. */
export const ANALYTICS_MAIL_PERIODS: readonly number[] = [7, 30, 90, 365];

/** The Analytics console in THIS environment — staging mails link to staging. */
export function analyticsConsoleUrl(path = ''): string {
  const registered = PORTAL_REGISTRY.find((portal) => portal.key === 'analytics')?.url ?? 'https://analytics.duncit.com/';
  const url = new URL(registered);
  if (getStatusEnvironment() === 'staging') url.hostname = `staging.${url.hostname}`;
  url.pathname = path || '/';
  return url.toString();
}
