import { resolvePeriod, type AnalyticsWindow, type PeriodRequest } from './window';
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
import { revenueAnalytics } from './revenue.analytics';
import { rewardsAnalytics } from './rewards.analytics';
import { shopAnalytics } from './shop.analytics';
import { venueAnalytics } from './venues.analytics';
import { marketingAnalytics } from './marketing.analytics';
import { communicationsAnalytics } from './communications.analytics';
import { supportAnalytics } from './support.analytics';
import { legalAnalytics } from './legal.analytics';
import { aiUsageAnalytics } from './aiUsage.analytics';
import { apiPerformanceAnalytics } from './apiPerformance.analytics';
import { serverAnalytics } from './server.analytics';
import { appReleaseAnalytics } from './appReleases.analytics';
import { funnelAnalytics } from './funnel.analytics';
import { petStoreAnalytics } from './petStore.analytics';
import type { Environment } from '@modules/ai/askBot/askBot.links';
import { analyticsTargetService } from '../goals/analyticsTarget.service';
import { consoleLink, resolveLinks, serverEnvironment, type ConsoleLink } from './links';
import { linkEverything, type AnalyticsEntity, type EntityAnalyticsSections } from './shapes';

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
  REVENUE: revenueAnalytics,
  REWARDS: rewardsAnalytics,
  SHOP: shopAnalytics,
  VENUES: venueAnalytics,
  MARKETING: marketingAnalytics,
  COMMUNICATIONS: communicationsAnalytics,
  SUPPORT: supportAnalytics,
  LEGAL: legalAnalytics,
  AI_USAGE: aiUsageAnalytics,
  API_PERFORMANCE: apiPerformanceAnalytics,
  SERVER: serverAnalytics,
  APP_RELEASES: appReleaseAnalytics,
  FUNNEL: funnelAnalytics,
  PET_STORE: petStoreAnalytics,
};

/**
 * The console each page's numbers are worked on, for every widget whose loader
 * names no page of its own — so no number on the Analytics console is a dead
 * end. Pages missing here set their links themselves (SonarQube links out to
 * SonarQube, for instance).
 */
const PAGE_LINKS: Partial<Record<AnalyticsEntity, ConsoleLink>> = {
  USERS: consoleLink('admin', '/users'),
  PODS: consoleLink('admin', '/pods'),
  CLUBS: consoleLink('clubs', '/clubs'),
  CLUB_ADMINS: consoleLink('club-admins', '/club-admins'),
  HOSTS: consoleLink('hosts', '/hosts'),
  DATABASE: consoleLink('tech', '/database/info'),
  ENV_KEYS: consoleLink('tech', '/'),
  STRESS_TESTS: consoleLink('tech', '/stress-testing/runs'),
  E2E_TESTS: consoleLink('tech', '/e2e/runs'),
  PET_STORE: consoleLink('ecomm-portal', '/'),
};

/** The pages whose every number can be narrowed to one city (see city.ts). */
export const CITY_ENTITIES: ReadonlySet<AnalyticsEntity> = new Set<AnalyticsEntity>(['PODS', 'CLUBS']);

export const entityAnalyticsService = {
  /** One page, its links built for `environment` — the reader's, or this server's for a mail. */
  async load(entity: AnalyticsEntity, request: PeriodRequest = {}, environment: Environment = serverEnvironment()) {
    // A city asked of a page that cannot narrow to one is dropped, so the period never claims a filter it did not apply.
    const city = CITY_ENTITIES.has(entity) ? request.city : null;
    const window = resolvePeriod({ ...request, city });
    const [loaded, goals] = await Promise.all([LOADERS[entity](window), analyticsTargetService.goalsFor(entity)]);
    const pageLink = PAGE_LINKS[entity];
    const sections = pageLink ? linkEverything(loaded, pageLink) : loaded;
    const linked = resolveLinks(sections, environment);
    return {
      entity,
      period: {
        days: window.days,
        from: window.from.toISOString(),
        to: window.to.toISOString(),
        granularity: window.granularity,
        compare: window.compare,
        previous_from: window.prevFrom.toISOString(),
        previous_to: window.prevTo.toISOString(),
        city: window.city,
      },
      ...linked,
      kpis: analyticsTargetService.withTargets(linked.kpis, goals, window.days),
    };
  },
};
