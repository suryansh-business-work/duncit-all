import { Text, XStack, YStack } from 'tamagui';
import { widerPodRequestRadius } from '@duncit/utils';

import { DuncitButton } from '@/components/DuncitButton';
import { SearchingNearby } from '@/components/searching-nearby';
import type { NearbyItem } from '@/hooks/useNearbyPartners';
import type { NearbySearchState } from '@/hooks/useNearbySearch';
import { useTranslation } from '@/hooks/useTranslation';
import { NearbyCard } from './NearbyCard';

interface Props {
  /** What is being searched for. */
  kind: 'HOST' | 'VENUE';
  state: NearbySearchState;
  items: readonly NearbyItem[];
  loading: boolean;
  error: string | null;
  /** No requests left this month. */
  quotaReached: boolean;
  onRequest: (item: NearbyItem) => void;
}

/** The result area: the radar while looking, the cards, or the empty state with ways to widen it. */
export function NearbyResults({
  kind,
  state,
  items,
  loading,
  error,
  quotaReached,
  onRequest,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const isHost = kind === 'HOST';
  const km = state.radiusKm;

  if (!state.locationId) {
    return (
      <Text testID="nearby-pick-location" role="status" fontSize={14} color="$muted">
        {t('podRequests.pickLocation')}
      </Text>
    );
  }
  if (loading) {
    return (
      <SearchingNearby
        title={isHost ? t('podRequests.searchingHosts') : t('podRequests.searchingVenues')}
        hint={t('podRequests.searchingHint', { vars: { km, place: state.placeName } })}
        icon={isHost ? 'person-search' : 'storefront'}
        testID="nearby-searching"
      />
    );
  }
  if (error) {
    return (
      <Text role="alert" testID="nearby-error" fontSize={13} color="$danger">
        {error}
      </Text>
    );
  }
  if (items.length === 0) {
    const wider = widerPodRequestRadius(km);
    return (
      <YStack testID="nearby-empty" alignItems="center" gap={12} paddingVertical={24}>
        <Text role="status" fontSize={15} fontWeight="600" color="$color" textAlign="center">
          {isHost
            ? t('podRequests.noHostsFound', { vars: { km } })
            : t('podRequests.noVenuesFound', { vars: { km } })}
        </Text>
        <XStack gap={8} flexWrap="wrap" justifyContent="center">
          {wider === null ? null : (
            <DuncitButton
              testID="nearby-widen"
              label={t('podRequests.expandSearch', { vars: { km: wider } })}
              onPress={() => state.setRadiusKm(wider)}
            />
          )}
          {state.categoryIds.length > 0 ? (
            <DuncitButton
              testID="nearby-all-categories"
              label={t('podRequests.tryAllCategories')}
              variant="outline"
              onPress={() => state.setCategoryIds([])}
            />
          ) : null}
        </XStack>
      </YStack>
    );
  }
  return (
    <YStack gap={12} testID="nearby-results">
      {items.map((item) => (
        <NearbyCard key={item.id} item={item} disabled={quotaReached} onRequest={onRequest} />
      ))}
    </YStack>
  );
}
