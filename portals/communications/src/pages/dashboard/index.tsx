// The Analytics console's Communications page, mounted here as it is — one
// implementation, two doors (as Admin mounts the Users page). The Dockerfile
// copies that console's src for the build, and the deploy filter rebuilds this
// console when it changes. The layout id is shared, so a layout saved in one
// console is the layout in the other.
import EntityAnalyticsPage from '../../../../analytics/src/pages/entity-analytics/EntityAnalyticsPage';
import { COMMUNICATIONS_PAGE } from '../../../../analytics/src/pages/entity-analytics/pages';

/** Dashboard: emails, WhatsApp and notifications sent, what failed, what it cost and the busiest templates. */
export default function CommunicationsDashboardPage() {
  return <EntityAnalyticsPage page={COMMUNICATIONS_PAGE} />;
}
