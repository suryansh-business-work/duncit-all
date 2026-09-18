import type { AnalyticsEntity } from './queries';

/** One Analytics dashboard: the route, what it reports on, its heading copy and where its layout is saved. */
export interface AnalyticsPageSpec {
  path: string;
  entity: AnalyticsEntity;
  title: string;
  subtitle: string;
  /**
   * The key each person's arrangement of this dashboard is stored under.
   * Renaming one throws every saved layout away, so treat it like a column name.
   */
  dashboardId: string;
  /** True for a page that reads only the state of things now, so a period would change nothing. */
  periodless?: boolean;
  /** True for a page whose every number has a place, so it can be narrowed to one city. */
  cityFilter?: boolean;
}

/** The console's dashboards, in sidebar order. The first is where `/` lands. */
export const ANALYTICS_PAGES: readonly AnalyticsPageSpec[] = [
  {
    path: '/users',
    entity: 'USERS',
    title: 'analytics.page.users.title',
    subtitle: 'analytics.page.users.subtitle',
    dashboardId: 'analytics.users',
  },
  {
    path: '/pods',
    entity: 'PODS',
    title: 'analytics.page.pods.title',
    subtitle: 'analytics.page.pods.subtitle',
    dashboardId: 'analytics.pods',
    cityFilter: true,
  },
  {
    path: '/clubs',
    entity: 'CLUBS',
    title: 'analytics.page.clubs.title',
    subtitle: 'analytics.page.clubs.subtitle',
    dashboardId: 'analytics.clubs',
    cityFilter: true,
  },
  {
    path: '/club-admins',
    entity: 'CLUB_ADMINS',
    title: 'analytics.page.clubAdmins.title',
    subtitle: 'analytics.page.clubAdmins.subtitle',
    dashboardId: 'analytics.clubAdmins',
  },
  {
    path: '/hosts',
    entity: 'HOSTS',
    title: 'analytics.page.hosts.title',
    subtitle: 'analytics.page.hosts.subtitle',
    dashboardId: 'analytics.hosts',
  },
  {
    path: '/venues',
    entity: 'VENUES',
    title: 'analytics.page.venues.title',
    subtitle: 'analytics.page.venues.subtitle',
    dashboardId: 'analytics.venues',
  },
  {
    path: '/revenue',
    entity: 'REVENUE',
    title: 'analytics.page.revenue.title',
    subtitle: 'analytics.page.revenue.subtitle',
    dashboardId: 'analytics.revenue',
  },
  {
    path: '/rewards',
    entity: 'REWARDS',
    title: 'analytics.page.rewards.title',
    subtitle: 'analytics.page.rewards.subtitle',
    dashboardId: 'analytics.rewards',
  },
  {
    path: '/shop',
    entity: 'SHOP',
    title: 'analytics.page.shop.title',
    subtitle: 'analytics.page.shop.subtitle',
    dashboardId: 'analytics.shop',
  },
  {
    path: '/pet-store',
    entity: 'PET_STORE',
    title: 'analytics.page.petStore.title',
    subtitle: 'analytics.page.petStore.subtitle',
    dashboardId: 'analytics.petStore',
  },
  {
    path: '/growth/funnel',
    entity: 'FUNNEL',
    title: 'analytics.page.funnel.title',
    subtitle: 'analytics.page.funnel.subtitle',
    dashboardId: 'analytics.funnel',
  },
  {
    path: '/growth/marketing',
    entity: 'MARKETING',
    title: 'analytics.page.marketing.title',
    subtitle: 'analytics.page.marketing.subtitle',
    dashboardId: 'analytics.marketing',
  },
  {
    path: '/growth/communications',
    entity: 'COMMUNICATIONS',
    title: 'analytics.page.communications.title',
    subtitle: 'analytics.page.communications.subtitle',
    dashboardId: 'analytics.communications',
  },
  {
    path: '/support/desk',
    entity: 'SUPPORT',
    title: 'analytics.page.support.title',
    subtitle: 'analytics.page.support.subtitle',
    dashboardId: 'analytics.support',
  },
  {
    path: '/support/legal',
    entity: 'LEGAL',
    title: 'analytics.page.legal.title',
    subtitle: 'analytics.page.legal.subtitle',
    dashboardId: 'analytics.legal',
  },
  {
    path: '/tech/database',
    entity: 'DATABASE',
    title: 'analytics.page.database.title',
    subtitle: 'analytics.page.database.subtitle',
    dashboardId: 'analytics.database',
    periodless: true,
  },
  {
    path: '/tech/env-keys',
    entity: 'ENV_KEYS',
    title: 'analytics.page.envKeys.title',
    subtitle: 'analytics.page.envKeys.subtitle',
    dashboardId: 'analytics.envKeys',
  },
  {
    path: '/tech/api',
    entity: 'API_PERFORMANCE',
    title: 'analytics.page.apiPerformance.title',
    subtitle: 'analytics.page.apiPerformance.subtitle',
    dashboardId: 'analytics.apiPerformance',
  },
  {
    path: '/tech/server',
    entity: 'SERVER',
    title: 'analytics.page.server.title',
    subtitle: 'analytics.page.server.subtitle',
    dashboardId: 'analytics.server',
  },
  {
    path: '/tech/ai-usage',
    entity: 'AI_USAGE',
    title: 'analytics.page.aiUsage.title',
    subtitle: 'analytics.page.aiUsage.subtitle',
    dashboardId: 'analytics.aiUsage',
  },
  {
    path: '/tech/app-releases',
    entity: 'APP_RELEASES',
    title: 'analytics.page.appReleases.title',
    subtitle: 'analytics.page.appReleases.subtitle',
    dashboardId: 'analytics.appReleases',
  },
  {
    path: '/security/sonarqube',
    entity: 'SONARQUBE',
    title: 'analytics.page.sonarqube.title',
    subtitle: 'analytics.page.sonarqube.subtitle',
    dashboardId: 'analytics.sonarqube',
  },
  {
    path: '/testing/unit-coverage',
    entity: 'TEST_COVERAGE',
    title: 'analytics.page.coverage.title',
    subtitle: 'analytics.page.coverage.subtitle',
    dashboardId: 'analytics.coverage',
  },
  {
    path: '/testing/stress',
    entity: 'STRESS_TESTS',
    title: 'analytics.page.stress.title',
    subtitle: 'analytics.page.stress.subtitle',
    dashboardId: 'analytics.stress',
  },
  {
    path: '/testing/e2e',
    entity: 'E2E_TESTS',
    title: 'analytics.page.e2e.title',
    subtitle: 'analytics.page.e2e.subtitle',
    dashboardId: 'analytics.e2e',
  },
];
