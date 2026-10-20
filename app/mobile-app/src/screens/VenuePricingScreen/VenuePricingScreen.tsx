import { useState } from 'react';
import { Spinner, Text, YStack } from 'tamagui';

import { StackScreen } from '@/components/StackScreen';
import { VenueSwitcher } from '@/components/studio';
import { RefreshScrollView } from '@/components/PullToRefresh';
import { VenuePricingForm, valuesToInput, type VenuePricingValues } from '@/forms/venue-pricing';
import { useTranslation } from '@/hooks/useTranslation';
import { useVenuePricing } from '@/hooks/useVenuePricing';
import { useVenuesWithSettings } from '@/hooks/useVenuesWithSettings';
import { toErrorMessage } from '@/utils/errors';
import { PricingCalendarSection } from './PricingCalendarSection';

/**
 * Venue Pricing Module — the Tamagui twin of the Partner Portal's page. Hosts
 * book the venue instantly at this pricing, so it replaces the old slot
 * availability calendar: the owner sets the model, the rates, the fees, the
 * hours and the price rules, previews the server's price live, and edits
 * single dates (price, block, holiday) on the calendar under it.
 *
 * The venue is picked from the same switcher as every Venue Studio screen.
 */
export function VenuePricingScreen() {
  const { t } = useTranslation();
  const { venues, venue, venueId, selectVenue, isLoading, error, refetch } =
    useVenuesWithSettings();
  const pricingState = useVenuePricing(venueId);
  const { pricing, save } = pricingState;
  const [saving, setSaving] = useState(false);
  const [savedOk, setSavedOk] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const submit = (values: VenuePricingValues) => {
    if (!pricing) return;
    setSaving(true);
    setSavedOk(false);
    setSaveError(null);
    save(valuesToInput(values, pricing))
      .then(() => setSavedOk(true))
      .catch((e: unknown) =>
        setSaveError(toErrorMessage(e, t('availability.pricingModule.saveFailed'))),
      )
      .finally(() => setSaving(false));
  };

  const loadError = error ?? pricingState.error;

  return (
    <StackScreen title={t('availability.pricingModule.title')} testID="venue-pricing-screen">
      <RefreshScrollView showsVerticalScrollIndicator={false}>
        <YStack gap={20} padding={16} paddingBottom={48}>
          {isLoading || pricingState.isLoading ? (
            <Spinner
              role="progressbar"
              aria-label={t('mweb.a11y.loading')}
              testID="venue-pricing-loading"
              color="$primary"
            />
          ) : null}
          <VenueSwitcher venues={venues} venueId={venueId} onSelect={selectVenue} />
          <Text fontSize={13} color="$muted">
            {t('availability.pricingModule.subtitle')}
          </Text>
          {loadError ? (
            <Text role="alert" testID="venue-pricing-load-error" fontSize={13} color="$danger">
              {loadError}
            </Text>
          ) : null}
          {!isLoading && !error && venues.length === 0 ? (
            <Text testID="venue-pricing-empty" fontSize={14} color="$muted">
              {t('mweb.venueAvailabilityPage.noVenues')}
            </Text>
          ) : null}
          {pricing && !pricing.configured ? (
            <Text testID="venue-pricing-not-configured" fontSize={13} color="$warning">
              {t('availability.pricingModule.notConfigured')}
            </Text>
          ) : null}
          {venue && venueId && pricing ? (
            <>
              <VenuePricingForm
                key={venueId}
                venueId={venueId}
                saved={pricing}
                regular={venue.settings.operating_hours}
                saving={saving}
                savedOk={savedOk}
                error={saveError}
                onSubmit={submit}
              />
              <PricingCalendarSection
                key={`calendar-${venueId}`}
                venueId={venueId}
                pricing={pricing}
                holidays={venue.settings.holidays}
                savePricing={save}
                onVenueChanged={refetch}
              />
            </>
          ) : null}
        </YStack>
      </RefreshScrollView>
    </StackScreen>
  );
}
