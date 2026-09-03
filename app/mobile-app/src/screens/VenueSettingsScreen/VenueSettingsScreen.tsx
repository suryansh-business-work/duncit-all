import { useState } from 'react';
import { ScrollView, Spinner, Text, YStack } from 'tamagui';

import { StackScreen } from '@/components/StackScreen';
import { VenueSwitcher } from '@/components/studio';
import {
  policyFromServer,
  policyToInput,
  VenueSettingsForm,
  type CancellationPolicyValues,
} from '@/forms/venue-settings';
import { UpdateVenueSettingsDocument } from '@/graphql/venue-availability';
import { useTranslation } from '@/hooks/useTranslation';
import { useVenuesWithSettings } from '@/hooks/useVenuesWithSettings';
import { graphqlRequest } from '@/services/graphql.client';
import { toErrorMessage } from '@/utils/errors';

/**
 * Venue settings — the Tamagui twin of mWeb's /venues/settings (rule 27): the
 * cancellation policy a venue owner writes for bookings at the venue the
 * switcher has picked. The rules are `@duncit/forms/schemas`'; the words are
 * the shared `venueSettings.*` namespace.
 */
export function VenueSettingsScreen() {
  const { t } = useTranslation();
  const { venues, venue, venueId, selectVenue, isLoading, refetch } = useVenuesWithSettings();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async (values: CancellationPolicyValues) => {
    if (!venue) return;
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      await graphqlRequest(
        UpdateVenueSettingsDocument,
        { venue_doc_id: venue.id, input: { cancellation: policyToInput(values, t) } },
        { auth: true },
      );
      setSaved(true);
      refetch();
    } catch (e) {
      setError(toErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <StackScreen title={t('mweb.venueSettingsPage.title')} testID="venue-settings-screen">
      <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        <YStack gap={14} padding={16} paddingBottom={48}>
          {isLoading ? <Spinner testID="venue-settings-loading" color="$primary" /> : null}
          <VenueSwitcher venues={venues} venueId={venueId} onSelect={selectVenue} />
          <Text fontSize={12.5} color="$muted">
            {t('mweb.venueSettingsPage.subtitle')}
          </Text>
          {!isLoading && venues.length === 0 ? (
            <Text testID="venue-settings-empty" fontSize={13} color="$muted">
              {t('mweb.venueSettingsPage.noVenues')}
            </Text>
          ) : null}
          {venue ? (
            // Keyed on the venue so switching venues starts a fresh form.
            <VenueSettingsForm
              key={venue.id}
              policy={policyFromServer(venue.settings?.cancellation)}
              saving={saving}
              saved={saved}
              error={error}
              onSubmit={(values) => {
                save(values).catch(() => undefined);
              }}
            />
          ) : null}
        </YStack>
      </ScrollView>
    </StackScreen>
  );
}
