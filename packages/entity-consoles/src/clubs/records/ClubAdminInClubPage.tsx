import { useParams } from 'react-router';
import ClubAdminDetailsPage from '../../club-admins/detail/ClubAdminDetailsPage';
import { clubTabPath } from './clubTabPath';

/**
 * `/clubs/:clubId/club-admins/:clubAdminId` — one of a club's admins, opened by
 * their name on the club's overview.
 *
 * The club-admins console's own record page: Back returns to the overview the
 * name was on, and Edit and Save stay inside the club.
 */
export default function ClubAdminInClubPage() {
  const { clubId = '' } = useParams<{ clubId: string }>();
  return <ClubAdminDetailsPage backTo={clubTabPath(clubId, 'overview')} />;
}
