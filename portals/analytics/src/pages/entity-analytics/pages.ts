import type { AnalyticsEntity } from './queries';

/** One Analytics page: the route, what it reports on, and its heading copy. */
export interface AnalyticsPageSpec {
  path: string;
  entity: AnalyticsEntity;
  title: string;
  subtitle: string;
}

/** The console's subject pages, in sidebar order. */
export const ANALYTICS_PAGES: readonly AnalyticsPageSpec[] = [
  {
    path: '/pods',
    entity: 'PODS',
    title: 'analytics.page.pods.title',
    subtitle: 'analytics.page.pods.subtitle',
  },
  {
    path: '/clubs',
    entity: 'CLUBS',
    title: 'analytics.page.clubs.title',
    subtitle: 'analytics.page.clubs.subtitle',
  },
  {
    path: '/club-admins',
    entity: 'CLUB_ADMINS',
    title: 'analytics.page.clubAdmins.title',
    subtitle: 'analytics.page.clubAdmins.subtitle',
  },
  {
    path: '/hosts',
    entity: 'HOSTS',
    title: 'analytics.page.hosts.title',
    subtitle: 'analytics.page.hosts.subtitle',
  },
];
