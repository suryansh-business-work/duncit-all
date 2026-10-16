import { useQuery } from '@apollo/client/react';
import { Alert, Card, CardContent, CircularProgress, Stack } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { DuncitButton } from '@duncit/buttons';
import type { UploadSurface } from '@duncit/media-picker';
import { isRentalListEditable, parseApiError, type RentalsVenue } from '@duncit/utils';
import { ADMIN_RENTAL_ITEMS, OWNER_RENTAL_ITEMS, RENTAL_ITEMS_CONFIG } from '../documents';
import RentalItemsForm from '.';

export interface VenueRentalItemsProps {
  venueId: string;
  /** Table- and test-id prefix of the mounting surface (`partners-app`, `venues`, `mweb`). */
  surface: string;
  /** `owner` reads the venue as its owner; `admin` reads any venue for a Venues console editor. */
  mode: 'owner' | 'admin';
  /** The Upload Settings surface the photo picker caps and compresses for. */
  uploadSurface?: UploadSurface;
  onSaved?: (venue: RentalsVenue) => void;
}

/** A venue's rented-items editor: loads the venue and the caps, then the form. */
export default function VenueRentalItems({ venueId, surface, mode, uploadSurface = 'PORTALS', onSaved }: Readonly<VenueRentalItemsProps>) {
  const { t } = useTranslation();
  const variables = { venue_id: venueId };
  const owner = useQuery(OWNER_RENTAL_ITEMS, { variables, skip: mode !== 'owner', fetchPolicy: 'cache-and-network' });
  const admin = useQuery(ADMIN_RENTAL_ITEMS, { variables, skip: mode !== 'admin', fetchPolicy: 'cache-and-network' });
  const configQuery = useQuery(RENTAL_ITEMS_CONFIG);
  const venueQuery = mode === 'admin' ? admin : owner;
  const venue = mode === 'admin' ? admin.data?.venue : owner.data?.myVenue;
  const config = configQuery.data?.venueRegistrationConfig;
  const failure = venueQuery.error ?? configQuery.error;
  const idPrefix = `${surface}-venue-rental-items`;

  if ((venueQuery.loading && !venueQuery.data) || (configQuery.loading && !config)) {
    return (
      <Stack sx={{ alignItems: 'center', py: 4 }}>
        <CircularProgress size={24} aria-label={t('venueRentals.items.loading')} />
      </Stack>
    );
  }
  if (failure || !config || !venue) {
    const retry = () => {
      venueQuery.refetch().catch(() => undefined);
      configQuery.refetch().catch(() => undefined);
    };
    return (
      <Alert
        severity="error"
        data-testid={`${idPrefix}-load-error`}
        action={
          <DuncitButton size="small" color="inherit" onClick={retry}>
            {t('venueRentals.guest.retry')}
          </DuncitButton>
        }
      >
        {failure ? parseApiError(failure) : t('venueRentals.items.loadFailed')}
      </Alert>
    );
  }
  if (!isRentalListEditable(venue)) {
    return (
      <Alert severity="info" data-testid={`${idPrefix}-not-approved`}>
        {t('venueRentals.items.notApproved')}
      </Alert>
    );
  }
  return (
    <Card variant="outlined" sx={{ borderRadius: 2 }}>
      <CardContent>
        <RentalItemsForm
          key={venue.id}
          venue={venue}
          config={config}
          upload={{ venueId: venue.id, surface: uploadSurface }}
          idPrefix={idPrefix}
          onSaved={onSaved}
        />
      </CardContent>
    </Card>
  );
}
