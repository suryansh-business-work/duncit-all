// The Analytics console's own Users dashboard, mounted here as it is — one
// implementation, two doors (as Tech mounts SonarQube). The Dockerfile copies
// that console's src for the build, and the deploy filter rebuilds this console
// when it changes. Only the heading is Admin's: the layout id is shared, so a
// layout saved in one console is the layout in the other.
import EntityAnalyticsPage from '../../../../analytics/src/pages/entity-analytics/EntityAnalyticsPage';
import { USERS_PAGE } from '../../../../analytics/src/pages/entity-analytics/pages';

const ADMIN_USERS_PAGE = {
  ...USERS_PAGE,
  path: '/users-dashboard',
  title: 'admin.usersDashboard.title',
  subtitle: 'admin.usersDashboard.subtitle',
};

/** User Management → Users Dashboard: members, activity, last seen and contact-data health. */
export default function UsersDashboardPage() {
  return <EntityAnalyticsPage page={ADMIN_USERS_PAGE} />;
}
