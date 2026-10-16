import { useCallback, useState } from 'react';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ResultOf } from '@graphql-typed-document-node/core';
import { Spinner, Text, YStack } from 'tamagui';
import { rentalMoney } from '@duncit/utils';

import { EmptyState } from '@/components/EmptyState';
import { LoadErrorNotice } from '@/components/club-admin/LoadErrorNotice';
import { SurfaceCard } from '@/components/SurfaceCard';
import {
  ProductRowShell,
  ProductThumb,
} from '@/components/details/PodShopProductRow/ProductRowParts';
import { RentablePodsDocument } from '@/graphql/rentals';
import { useReloadableQuery } from '@/hooks/useReloadableQuery';
import { useTranslation } from '@/hooks/useTranslation';
import type { RootStackParamList } from '@/navigation/types';
import { graphqlRequest } from '@/services/graphql.client';
import { formatDateTime } from '@/utils/date-format';

type RentablePod = ResultOf<typeof RentablePodsDocument>['rentablePods'][number];

/** Pod Rent on the Shop screen: upcoming pods whose venue rents things out. RN twin of mWeb's PodRentTab. */
export function RentablePodsList() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const [pods, setPods] = useState<RentablePod[] | null>(null);
  const [failed, setFailed] = useState(false);
  const load = useCallback(async () => {
    setPods((await graphqlRequest(RentablePodsDocument, {})).rentablePods);
    setFailed(false);
  }, []);
  const query = useReloadableQuery(load, { onError: () => setFailed(true) });

  if (failed && !pods) {
    return (
      <YStack padding={24}>
        <LoadErrorNotice
          testID="shop-rent-error"
          message={t('venueRentals.guest.loadError')}
          retryLabel={t('venueRentals.guest.retry')}
          onRetry={() => {
            query.refetch().catch(() => undefined);
          }}
        />
      </YStack>
    );
  }
  if (!pods) {
    return (
      <YStack alignItems="center" paddingVertical={48}>
        <Spinner size="large" />
      </YStack>
    );
  }
  if (pods.length === 0)
    return (
      <EmptyState testID="shop-rent-empty" icon="handshake" title={t('venueRentals.guest.none')} />
    );
  return (
    <YStack gap={10} paddingHorizontal={16} testID="shop-rent-list">
      {pods.map((pod) => (
        <SurfaceCard
          key={pod.id}
          padding={0}
          role="button"
          tabIndex={0}
          aria-label={pod.pod_title}
          testID={`shop-rent-pod-${pod.id}`}
          onPress={() => navigation.navigate('PodDetails', { podId: pod.id, title: pod.pod_title })}
        >
          <ProductRowShell testID={`shop-rent-row-${pod.id}`} selected={false}>
            <ProductThumb image={pod.cover_url} />
            <YStack flex={1} gap={2}>
              <Text fontSize={14} fontWeight="700" color="$color" numberOfLines={1}>
                {pod.pod_title}
              </Text>
              <Text fontSize={12} color="$muted" numberOfLines={1}>
                {[formatDateTime(pod.pod_date_time), pod.venue_name].filter(Boolean).join(' · ')}
              </Text>
              <Text fontSize={12.5} fontWeight="600" color="$color">
                {t('venueRentals.guest.podItems', {
                  vars: {
                    count: pod.item_count,
                    amount: rentalMoney(pod.currency_symbol, pod.from_rate),
                  },
                })}
              </Text>
            </YStack>
          </ProductRowShell>
        </SurfaceCard>
      ))}
    </YStack>
  );
}
