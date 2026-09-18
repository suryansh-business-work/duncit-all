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
];
