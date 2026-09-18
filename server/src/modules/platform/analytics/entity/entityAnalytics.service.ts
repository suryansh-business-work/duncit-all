import { resolveWindow, type AnalyticsWindow } from './window';
import { podAnalytics } from './pods.analytics';
import { clubAnalytics } from './clubs.analytics';
import { clubAdminAnalytics } from './clubAdmins.analytics';
import { hostAnalytics } from './hosts.analytics';
import { userAnalytics } from './users.analytics';
import { databaseAnalytics } from './database.analytics';
import { envKeyAnalytics } from './envKeys.analytics';
import { sonarAnalytics } from './sonar.analytics';
import { coverageAnalytics } from './coverage.analytics';
import { stressAnalytics } from './stress.analytics';
import { e2eAnalytics } from './e2e.analytics';
import type { AnalyticsEntity, EntityAnalyticsSections } from './shapes';

const LOADERS: Record<AnalyticsEntity, (window: AnalyticsWindow) => Promise<EntityAnalyticsSections>> = {
  USERS: userAnalytics,
  PODS: podAnalytics,
  CLUBS: clubAnalytics,
  CLUB_ADMINS: clubAdminAnalytics,
  HOSTS: hostAnalytics,
  DATABASE: databaseAnalytics,
  ENV_KEYS: envKeyAnalytics,
  SONARQUBE: sonarAnalytics,
  TEST_COVERAGE: coverageAnalytics,
  STRESS_TESTS: stressAnalytics,
  E2E_TESTS: e2eAnalytics,
};

export const entityAnalyticsService = {
  async load(entity: AnalyticsEntity, days?: number | null) {
    const window = resolveWindow(days);
    const sections = await LOADERS[entity](window);
    return {
      entity,
      period: {
        days: window.days,
        from: window.from.toISOString(),
        to: window.to.toISOString(),
        granularity: window.granularity,
      },
      ...sections,
    };
  },
};
