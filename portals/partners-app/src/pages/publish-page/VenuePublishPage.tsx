import { useQuery } from '@apollo/client/react';
import { Alert, Stack } from '@mui/material';
import { PublishPageCard } from '@duncit/public-page';
import { useTranslation } from '@duncit/shell';
import { venueLabel, type SwitchableVenue } from '@duncit/utils';
import { MY_VENUES } from '../register-venue-page/queries';
import StudioPageHeader from '../../components/studio/StudioPageHeader';
import VenueStudioBody from '../../components/venue/VenueStudioBody';

/**
 * Publish Your Venue — the public page, link and QR for the selected venue.
 * Only an approved venue has a page to publish; any other gets the reason.
 */
export default function VenuePublishPage() {
  const { t } = useTranslation();
  const { data, loading, error } = useQuery<{ myVenues: SwitchableVenue[] }>(MY_VENUES, {
    fetchPolicy: 'cache-and-network',
  });

  return (
    <Stack spacing={2.5} sx={{ width: '100%', maxWidth: 760 }} data-testid="venue-publish-page">
      <StudioPageHeader
        title={t('mweb.studioOptions.publishVenue')}
        hint={t('mweb.studioOptions.publishVenueHint')}
      />
      <VenueStudioBody
        venues={data?.myVenues}
        loading={loading}
        errorAlert={error ? <Alert severity="error">{error.message}</Alert> : null}
      >
        {(venue) =>
          venue.status === 'APPROVED' ? (
            <PublishPageCard
              key={venue.id}
              kind="VENUE"
              refId={venue.id}
              title={venueLabel(venue, t('mweb.venueManagePage.untitledVenue'))}
            />
          ) : (
            <Alert severity="info" data-testid="venue-publish-needs-approval">
              {t('mweb.studioOptions.publishNeedsApproval')}
            </Alert>
          )
        }
      </VenueStudioBody>
    </Stack>
  );
}
