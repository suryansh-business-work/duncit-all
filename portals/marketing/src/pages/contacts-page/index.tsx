// The Analytics console's Contacts page, mounted here as it is — one
// implementation, two doors (as Admin mounts the Users page). The Dockerfile
// copies that console's src for the build, and the deploy filter rebuilds this
// console when it changes. The layout id is shared, so a layout saved in one
// console is the layout in the other.
import EntityAnalyticsPage from '../../../../analytics/src/pages/entity-analytics/EntityAnalyticsPage';
import { CONTACTS_PAGE } from '../../../../analytics/src/pages/entity-analytics/pages';

/**
 * Contacts: members' phone-book syncs and the invites they sent, as counts.
 * Nobody from a phone book is ever shown — the page's note says so.
 */
export default function ContactsDashboardPage() {
  return <EntityAnalyticsPage page={CONTACTS_PAGE} />;
}
