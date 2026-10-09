import { useQuery } from '@apollo/client/react';
import { Link as RouterLink } from 'react-router';
import { Alert, Skeleton } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import type { SwitchableVenue } from '@duncit/utils';
import { MY_VENUES } from '../register-venue-page/queries';
import VenuePicker from '../../components/venue/VenuePicker';
import { useSelectedVenue } from '../../components/venue/useSelectedVenue';

/**
 * The top of Venue Options: which venue every option below opens for. The
 * pick is remembered, so the dashboard, pods, settings, availability and
 * publish pages all open on it.
 */
export default function VenueOptionsPicker() {
  const { t } = useTranslation();
  const { data, loading, error } = useQuery<{ myVenues: SwitchableVenue[] }>(MY_VENUES, {
    fetchPolicy: 'cache-and-network',
  });
  const venues = data?.myVenues ?? [];
  const { venueId, selectVenue } = useSelectedVenue(venues);

  if (loading && !data) return <Skeleton variant="rounded" height={56} aria-label={t('shell.a11y.loading')} />;
  if (error) return <Alert severity="error">{error.message}</Alert>;
  if (venues.length === 0) {
    return (
      <Alert
        severity="info"
        data-testid="venue-options-no-venues"
        action={
          <DuncitButton component={RouterLink} to="/register-venue/new" size="small">
            {t('mweb.studioOptions.addVenue')}
          </DuncitButton>
        }
      >
        {t('mweb.studioOptions.noVenuesYet')}
      </Alert>
    );
  }
  return (
    <VenuePicker
      venues={venues}
      value={venueId}
      onChange={selectVenue}
      helperText={t('mweb.studioOptions.selectVenueHint')}
    />
  );
}
