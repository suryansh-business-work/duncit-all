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
  },
  {
    path: '/clubs',
    entity: 'CLUBS',
    title: 'analytics.page.clubs.title',
    subtitle: 'analytics.page.clubs.subtitle',
    dashboardId: 'analytics.clubs',
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
    path: '/pet-store',
    entity: 'PET_STORE',
    title: 'analytics.page.petStore.title',
    subtitle: 'analytics.page.petStore.subtitle',
    dashboardId: 'analytics.petStore',
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
