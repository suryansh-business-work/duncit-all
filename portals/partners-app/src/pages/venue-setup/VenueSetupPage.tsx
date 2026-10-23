import type { ReactNode } from 'react';
import { useQuery } from '@apollo/client/react';
import { Alert, Stack } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { parseApiError } from '@duncit/utils';
import StudioPageHeader from '../../components/studio/StudioPageHeader';
import VenueStudioBody from '../../components/venue/VenueStudioBody';
import { MY_VENUES } from '../register-venue-page/queries';

/** A venue as the venue list reads it — with its settings (hours, weekly off, holidays). */
export interface SetupVenue {
  id: string;
  status: string;
  venue_name: string;
  settings?: {
    operating_hours?: { open: string; close: string } | null;
    weekly_off_days?: number[] | null;
    holidays?: string[] | null;
  } | null;
}

interface Props {
  /** The option's catalogue keys (`mweb.studioOptions.*`) — its page title and hint. */
  titleKey: string;
  hintKey: string;
  testId: string;
  /** The page body for the selected venue; `refetch` re-reads the venue list (its settings). */
  children: (venue: SetupVenue, refetch: () => Promise<unknown>) => ReactNode;
}

/**
 * A Venue Options setup page: its title, the venue picker, and its body for
 * the selected venue — for a venue at ANY status, so a draft or a venue under
 * review can be set up before it is approved.
 */
export default function VenueSetupPage({ titleKey, hintKey, testId, children }: Readonly<Props>) {
  const { t } = useTranslation();
  const { data, loading, error, refetch } = useQuery<{ myVenues: SetupVenue[] }>(MY_VENUES, {
    fetchPolicy: 'cache-and-network',
  });
  const errorAlert = error ? <Alert severity="error">{parseApiError(error)}</Alert> : null;

  return (
    <Stack spacing={2.5} sx={{ width: '100%' }} data-testid={testId}>
      <StudioPageHeader title={t(titleKey)} hint={t(hintKey)} />
      <VenueStudioBody venues={data?.myVenues} loading={loading} errorAlert={errorAlert}>
        {(venue) => children(venue, refetch)}
      </VenueStudioBody>
    </Stack>
  );
}
