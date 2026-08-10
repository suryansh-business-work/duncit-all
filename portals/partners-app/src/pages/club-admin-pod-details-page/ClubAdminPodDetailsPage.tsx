import { useParams } from 'react-router-dom';
import { PodDetailsPage } from '@duncit/pod-details';

/**
 * Club Admin's pod detail — the SAME page the admin portal renders, at
 * CLUB_ADMIN scope.
 *
 * Scope is not cosmetic: it swaps every self-fetching section onto the
 * club-scoped twin of its query, because CLUB_ADMIN is a membership of a club
 * rather than a role, and the admin operations refuse it. The server gates each
 * twin on `assertClubAdminForPod`, so a club admin reaching another club's pod
 * gets FORBIDDEN whatever this route says.
 *
 * Back returns to the club's own pod list. Edit routes into that list's editor,
 * which is where a club admin edits a pod today.
 */
export default function ClubAdminPodDetailsPage() {
  const { clubId = '' } = useParams();
  const clubPods = `/club-admin/clubs/${clubId}`;

  return (
    <PodDetailsPage
      scope="CLUB_ADMIN"
      backTo={clubPods}
      backLabel="Club pods"
      editTo={(podId) => `${clubPods}?edit=${podId}`}
    />
  );
}
