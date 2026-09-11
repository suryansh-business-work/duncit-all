import { useParams } from 'react-router';
import { useQuery } from '@apollo/client/react';
import { POD_DETAIL } from '@duncit/pod-details';
import { useTranslation } from '@duncit/shell';
import PodDetailsPage from '../../pods/detail/PodDetailsPage';
import { clubTabPath } from './clubTabPath';

interface PodClubData {
  pod: { club_id?: string | null } | null;
}

/**
 * `/pods/:id` in the clubs console — a pod opened from a club's Pods tab, or
 * from the Pods tab of one of its hosts.
 *
 * The pods console's own page. Back returns to the pod's OWN club: a pod
 * belongs to exactly one, so that answer holds whichever way the reader came
 * in. The club is read off the same document and variables the page itself
 * fetches, so Apollo answers both from one request — and the page only draws
 * Back once that answer is in.
 */
export default function PodInClubPage() {
  const { t } = useTranslation();
  const { id = '' } = useParams();
  const { data } = useQuery<PodClubData>(POD_DETAIL, { variables: { id }, skip: !id });
  const clubId = data?.pod?.club_id;
  const backTo = clubId ? clubTabPath(clubId, 'pods') : '/clubs';

  return <PodDetailsPage backTo={backTo} backLabel={t('directory.clubs.backToClub')} />;
}
