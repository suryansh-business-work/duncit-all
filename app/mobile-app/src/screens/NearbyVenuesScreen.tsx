import { StackScreen } from '@/components/StackScreen';
import { NearbySearchBody } from '@/components/nearby-partners/NearbySearchBody';
import { RefreshScrollView } from '@/components/PullToRefresh';
import { useNearbyVenues } from '@/hooks/useNearbyVenues';
import { useTranslation } from '@/hooks/useTranslation';

/**
 * Host Studio → Search Nearby Venues (/host/nearby-venues, mWeb's path):
 * approved venues around the picked location, filtered to the host's own
 * categories to start. "Request Pod" sends a HOST_TO_VENUE request.
 */
export function NearbyVenuesScreen() {
  const { t } = useTranslation();
  const { state, hostLoading, hostError, partners, send } = useNearbyVenues();

  return (
    <StackScreen title={t('podRequests.searchVenuesTitle')} testID="nearby-venues-screen">
      <RefreshScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ padding: 16, paddingBottom: 48 }}
      >
        <NearbySearchBody
          kind="VENUE"
          state={state}
          items={partners.items}
          loading={hostLoading || partners.isLoading}
          error={hostError ?? partners.error}
          quota={partners.quota}
          send={send}
        />
      </RefreshScrollView>
    </StackScreen>
  );
}
