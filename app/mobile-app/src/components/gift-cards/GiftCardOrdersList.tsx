import { useCallback, useEffect, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';
import { Image } from 'expo-image';
import { Spinner, Text, XStack, YStack } from 'tamagui';
import { PRESS_STYLE } from '@duncit/buttons-native';
import {
  giftCardOrderHeadline,
  type GiftCardOrderStatusFacts,
  type GiftCardOrderTone,
} from '@duncit/utils';

import { SurfaceCard } from '@/components/SurfaceCard';
import { MobileMyGiftCardOrdersDocument } from '@/graphql/gift-cards';
import { graphqlRequest } from '@/services/graphql.client';
import { useTranslation } from '@/hooks/useTranslation';
import { formatMoney } from '@/utils/checkout-math';

export type GiftCardOrderRow = ResultOf<
  typeof MobileMyGiftCardOrdersDocument
>['myGiftCardOrders']['rows'][number];

const TONE_COLOR: Record<GiftCardOrderTone, string> = {
  success: '$primary',
  info: '$accent',
  warning: '$danger',
  error: '$danger',
  neutral: '$muted',
};

/** The order's headline — payment until paid, then where the cards are (shared with mWeb). */
export function GiftCardOrderStatus({
  order,
  testID,
}: Readonly<{ order: GiftCardOrderStatusFacts; testID?: string }>) {
  const { t } = useTranslation();
  const { key, tone } = giftCardOrderHeadline(order);
  return (
    <Text testID={testID} fontSize={12} fontWeight="700" color={TONE_COLOR[tone]}>
      {t(key)}
    </Text>
  );
}

/** How many orders the tab lists — a member's gift card history is short. */
const PAGE_SIZE = 50;

/** The member's gift card orders, newest first; each opens its tracking screen. mWeb twin: OrdersTab. */
export function GiftCardOrdersList({ onOpen }: Readonly<{ onOpen: (orderNo: string) => void }>) {
  const { t } = useTranslation();
  const [rows, setRows] = useState<GiftCardOrderRow[] | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    setFailed(false);
    try {
      const data = await graphqlRequest(
        MobileMyGiftCardOrdersDocument,
        { page: 1, page_size: PAGE_SIZE },
        { auth: true },
      );
      setRows(data.myGiftCardOrders.rows);
    } catch {
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  if (failed && !rows) {
    return (
      <Text testID="gift-card-orders-error" role="alert" fontSize={13} color="$danger">
        {t('mweb.giftCards.ordersLoadError')}
      </Text>
    );
  }
  if (!rows) {
    return (
      <YStack alignItems="center" paddingVertical={32}>
        <Spinner testID="gift-card-orders-loading" size="large" color="$primary" />
      </YStack>
    );
  }
  if (rows.length === 0) {
    return (
      <Text
        testID="gift-card-orders-empty"
        fontSize={14}
        color="$muted"
        textAlign="center"
        paddingVertical={24}
      >
        {t('mweb.giftCards.ordersEmpty')}
      </Text>
    );
  }
  return (
    <YStack gap={10} testID="gift-card-orders-list">
      {rows.map((order) => {
        const delivery =
          order.delivery_mode === 'PHYSICAL'
            ? t('mweb.giftCards.deliveryPhysical')
            : t('mweb.giftCards.deliveryDigital');
        return (
          <SurfaceCard
            key={order.id}
            testID={`gift-card-order-${order.order_no}`}
            role="button"
            onPress={() => onOpen(order.order_no)}
            {...PRESS_STYLE}
          >
            <XStack gap={12} alignItems="center">
              {order.design_front_url ? (
                <Image
                  source={{ uri: order.design_front_url }}
                  style={{ width: 64, height: 40, borderRadius: 6 }}
                  contentFit="cover"
                />
              ) : null}
              <YStack flex={1} gap={2}>
                <Text fontSize={15} fontWeight="700" numberOfLines={1}>
                  {order.order_no}
                </Text>
                <Text fontSize={13} color="$muted" numberOfLines={1}>
                  {t('mweb.giftCards.orderLine', {
                    vars: {
                      n: order.quantity,
                      amount: formatMoney(order.currency_symbol, order.amount),
                      delivery,
                    },
                  })}
                </Text>
              </YStack>
              <YStack alignItems="flex-end" gap={4}>
                <Text fontSize={15} fontWeight="700">
                  {formatMoney(order.currency_symbol, order.total)}
                </Text>
                <GiftCardOrderStatus order={order} />
              </YStack>
            </XStack>
          </SurfaceCard>
        );
      })}
    </YStack>
  );
}
