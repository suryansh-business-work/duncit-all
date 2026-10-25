import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { Alert, Box, Card, CardContent, Skeleton, Typography } from '@mui/material';
import { createLogger } from '@duncit/logs';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/shell';
import VenueOffersForm from './venue-offers.form';
import { toVenueOffersInput, toVenueOffersValues } from './venue-offers.schema';
import type { VenueOfferDefaultsValues } from './venue-offers.types';
import { APP_SETTINGS_VENUE_OFFERS, UPDATE_APP_SETTINGS_VENUE_OFFERS, type AppSettingsVenueOffers } from './queries';

const logger = createLogger('portal', 'admin');

/**
 * Settings > Venue offers: the platform defaults every venue's booking offers
 * fall back to while the venue has set none of its own (0) — the fewest guests
 * an offer may be for, and the hours either side has to answer it.
 */
export default function VenueOffersSection({ onToast }: Readonly<{ onToast: (message: string) => void }>) {
  const { t } = useTranslation();
  const { data, loading, error } = useQuery<AppSettingsVenueOffers>(APP_SETTINGS_VENUE_OFFERS, {
    fetchPolicy: 'cache-and-network',
  });
  // AppSettings is a singleton with no id, so the section re-reads its own
  // query rather than relying on the cache to merge the mutation's answer.
  const [save, saveState] = useMutation(UPDATE_APP_SETTINGS_VENUE_OFFERS, {
    refetchQueries: [{ query: APP_SETTINGS_VENUE_OFFERS }],
    awaitRefetchQueries: true,
  });
  const [saveError, setSaveError] = useState<string | null>(null);

  const settings = data?.appSettings;
  const minGuests = settings?.venue_offer_min_guests_default;
  const responseHours = settings?.venue_offer_response_hours_default;
  const initialValues = useMemo(
    () =>
      minGuests === undefined || responseHours === undefined
        ? null
        : toVenueOffersValues({ venue_offer_min_guests_default: minGuests, venue_offer_response_hours_default: responseHours }),
    [minGuests, responseHours],
  );

  const submit = async (values: VenueOfferDefaultsValues) => {
    setSaveError(null);
    try {
      await save({ variables: { input: toVenueOffersInput(values) } });
      onToast(t('admin.venueOfferSettings.saved'));
    } catch (e) {
      logger.warn('settings', 'venueOfferDefaults', { error: e });
      setSaveError(parseApiError(e));
    }
  };

  const body = () => {
    if (initialValues) {
      return <VenueOffersForm initialValues={initialValues} saving={saveState.loading} error={saveError} onSubmit={submit} />;
    }
    if (loading) return <Skeleton variant="rounded" height={72} />;
    return <Alert severity="error">{error ? parseApiError(error) : t('admin.venueOfferSettings.loadFailed')}</Alert>;
  };

  return (
    <Card data-testid="venue-offers-section">
      <CardContent>
        <Box sx={{ mb: 2 }}>
          <Typography variant="subtitle1" component="h2">
            {t('admin.venueOfferSettings.title')}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {t('admin.venueOfferSettings.intro')}
          </Typography>
        </Box>
        {body()}
      </CardContent>
    </Card>
  );
}
