import { useQuery } from '@apollo/client/react';
import { Stack } from '@mui/material';
import MoveToInboxRoundedIcon from '@mui/icons-material/MoveToInboxRounded';
import StudioPageHeader from '../../components/StudioPageHeader';
import { useTranslation } from '../../i18n/useTranslation';
import type { PodRequestSide } from '@duncit/utils';
import { useSelectedVenue } from '../../hooks/useSelectedVenue';
import VenueSwitcher from '../venue-manage-page/VenueSwitcher';
import { MY_VENUES_SWITCHER } from '../venue-manage-page/queries';
import PodRequestsSection from './PodRequestsSection';

/**
 * Studio menu → Requests → Pod Requests: the inbox that used to live only
 * inside Host / Venue Studio, given its own page so the menu can open it
 * directly (`/host/pod-requests`, `/venues/pod-requests`). The section is the
 * same one the studio page shows — not a second copy.
 *
 * The venue side reads ONE venue's requests — the one the Venue Options page
 * selected — with the switcher on top, like every other venue page.
 */
export default function PodRequestsPage({ side }: Readonly<{ side: PodRequestSide }>) {
  const { t } = useTranslation();
  const isVenue = side === 'VENUE';
  const venuesQuery = useQuery(MY_VENUES_SWITCHER, { skip: !isVenue, fetchPolicy: 'cache-and-network' });
  const venues = venuesQuery.data?.myVenues ?? [];
  const { venueId, selectVenue } = useSelectedVenue(venues);
  // Until the list answers there is no venue to narrow to; reading every
  // venue's requests first and then one venue's would flash the wrong inbox.
  const venuePending = isVenue && venuesQuery.loading && !venuesQuery.data;

  return (
    <Stack spacing={2} sx={{ px: 2, py: 2 }} data-testid={`pod-requests-page-${side.toLowerCase()}`}>
      <StudioPageHeader icon={<MoveToInboxRoundedIcon fontSize="small" />} title={t('mweb.studioNav.podRequests')} />
      {isVenue && <VenueSwitcher venues={venues} venueId={venueId} onChange={selectVenue} />}
      {!venuePending && <PodRequestsSection side={side} venueId={isVenue ? (venueId ?? undefined) : undefined} />}
    </Stack>
  );
}
