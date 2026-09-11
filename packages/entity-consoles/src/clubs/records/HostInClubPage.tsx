import { useParams } from 'react-router';
import HostDetailsPage from '../../hosts/detail/HostDetailsPage';
import { clubTabPath } from './clubTabPath';

/**
 * `/clubs/:clubId/hosts/:hostId` — a club's host, opened from its Hosts tab.
 *
 * The hosts console's own record page, not a copy: Back returns to the club's
 * Hosts tab, and Edit and Save stay inside the club because the page resolves
 * its own links from the path it is on.
 */
export default function HostInClubPage() {
  const { clubId = '' } = useParams<{ clubId: string }>();
  return <HostDetailsPage backTo={clubTabPath(clubId, 'hosts')} />;
}
