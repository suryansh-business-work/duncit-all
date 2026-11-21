import { Spinner, Text, YStack } from 'tamagui';

import { StackScreen } from '@/components/StackScreen';
import { VenueSwitcher } from '@/components/studio';
import { RefreshScrollView } from '@/components/PullToRefresh';
import { useTranslation } from '@/hooks/useTranslation';
import { useVenuesWithSettings } from '@/hooks/useVenuesWithSettings';
import { BookingOffersCard } from './BookingOffersCard';
import { VenueFeesCard } from './VenueFeesCard';

/**
 * Fees & Minimum Spend — the Tamagui twin of mWeb's /venues/fees and the
 * Partners console page (rule 27): the venue's one pricing setup for the venue
 * the switcher picked — its booking offers and minimum spend (the rules a
 * host's offer must meet), then the fees, deposit and GST added to the price.
 * Each part saves on its own.
 */
export function VenueFeesScreen() {
  const { t } = useTranslation();
  const { venues, venue, venueId, selectVenue, isLoading, error, refetch } =
    useVenuesWithSettings();

  return (
    <StackScreen title={t('mweb.studioOptions.venueFees')} testID="venue-fees-screen">
      <RefreshScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <YStack gap={20} padding={16} paddingBottom={48}>
          {isLoading ? (
            <Spinner
              role="progressbar"
              aria-label={t('mweb.a11y.loading')}
              testID="venue-fees-screen-loading"
              color="$primary"
            />
          ) : null}
          <VenueSwitcher venues={venues} venueId={venueId} onSelect={selectVenue} />
          {error ? (
            <Text role="alert" testID="venue-fees-screen-error" fontSize={13} color="$danger">
              {error}
            </Text>
          ) : null}
          {!isLoading && !error && venues.length === 0 ? (
            <Text testID="venue-fees-screen-empty" fontSize={14} color="$muted">
              {t('mweb.venueSettingsPage.noVenues')}
            </Text>
          ) : null}
          {venue ? (
            // Keyed on the venue so switching venues starts fresh forms and save states.
            <YStack key={venue.id} gap={20}>
              <BookingOffersCard venue={venue} onSaved={refetch} />
              <VenueFeesCard venueId={venue.id} regular={venue.settings.operating_hours} />
            </YStack>
          ) : null}
        </YStack>
      </RefreshScrollView>
    </StackScreen>
  );
}
