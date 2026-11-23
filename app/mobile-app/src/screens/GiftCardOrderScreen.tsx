import { useCallback, useEffect, useState } from 'react';
import { useRoute, type RouteProp } from '@react-navigation/native';
import type { ResultOf } from '@graphql-typed-document-node/core';
import { Separator, Spinner, Text, XStack, YStack } from 'tamagui';
import { GIFT_CARD_ORDER_POLL_MS, giftCardOrderSteps, isGiftCardOrderLive } from '@duncit/utils';

import { StackScreen } from '@/components/StackScreen';
import { SurfaceCard } from '@/components/SurfaceCard';
import { GiftCardVisual } from '@/components/gift-cards';
import { GiftCardOrderStatus } from '@/components/gift-cards/GiftCardOrdersList';
import { GiftCardSummaryRow } from '@/components/gift-cards/GiftCardSummaryRow';
import { GiftCardScopeType } from '@/generated/graphql/graphql';
import { MobileMyGiftCardOrderDocument } from '@/graphql/gift-cards';
import { graphqlRequest } from '@/services/graphql.client';
import { useTranslation } from '@/hooks/useTranslation';
import { formatMoney } from '@/utils/checkout-math';
import type { RootStackParamList } from '@/navigation/types';
import { RefreshScrollView, useRefreshRegistration } from '@/components/PullToRefresh';

type Order = ResultOf<typeof MobileMyGiftCardOrderDocument>['myGiftCardOrder'];

function Tracking({ order }: Readonly<{ order: Order }>) {
  const { t } = useTranslation();
  const a = order.shipping_address;
  const s = order.shipment;
  const address = a
    ? [a.line1, a.line2, a.landmark, a.city, a.state, a.pincode].filter(Boolean).join(', ')
    : '';
  return (
    <SurfaceCard gap={10} testID="gift-card-order-tracking">
      <Text fontSize={15} fontWeight="700">
        {t('mweb.giftCards.trackingTitle')}
      </Text>
      {a ? (
        <GiftCardSummaryRow
          testID="gift-card-order-ship-to"
          label={t('mweb.giftCards.deliverTo')}
          value={`${a.name} · ${address}`}
        />
      ) : null}
      {s ? (
        <YStack gap={8}>
          <GiftCardSummaryRow
            testID="gift-card-order-courier"
            label={t('mweb.giftCards.courier')}
            value={s.courier_name || '—'}
          />
          <GiftCardSummaryRow
            testID="gift-card-order-awb"
            label={t('mweb.giftCards.trackingNumber')}
            value={s.awb || '—'}
          />
          {s.etd ? (
            <GiftCardSummaryRow
              testID="gift-card-order-etd"
              label={t('mweb.giftCards.expectedDelivery')}
              value={s.etd}
            />
          ) : null}
        </YStack>
      ) : (
        <Text testID="gift-card-order-not-shipped" fontSize={13} color="$muted">
          {t('mweb.giftCards.notShippedYet')}
        </Text>
      )}
      {[...order.tracking_events].reverse().map((e) => (
        <YStack key={`${e.at}-${e.status}`} testID="gift-card-order-scan" gap={2}>
          <Text fontSize={14} fontWeight="600">
            {e.status}
          </Text>
          <Text fontSize={12} color="$muted">
            {[e.location, e.note].filter(Boolean).join(' · ')}
          </Text>
        </YStack>
      ))}
    </SurfaceCard>
  );
}

/**
 * One gift card order — status, progress, what was paid and, for printed cards,
 * the courier and every scan. Re-reads itself while the order is still moving.
 * The order emails and WhatsApp messages deep-link here. mWeb twin: GiftCardOrderPage.
 */
export function GiftCardOrderScreen() {
  const { t } = useTranslation();
  const { orderNo } = useRoute<RouteProp<RootStackParamList, 'GiftCardOrder'>>().params;
  const [order, setOrder] = useState<Order | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await graphqlRequest(
        MobileMyGiftCardOrderDocument,
        { order_no: orderNo },
        { auth: true },
      );
      setOrder(data.myGiftCardOrder);
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, [orderNo]);

  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);
  useRefreshRegistration(load);

  const live = !!order && isGiftCardOrderLive(order);
  // Re-read while the order can still change; an order at rest is left alone.
  useEffect(() => {
    if (!live) return undefined;
    const timer = setInterval(() => load().catch(() => undefined), GIFT_CARD_ORDER_POLL_MS);
    return () => clearInterval(timer);
  }, [live, load]);

  const money = (n: number) => formatMoney(order?.currency_symbol ?? '₹', n);
  let body;
  if (order) {
    body = (
      <YStack gap={16}>
        <XStack justifyContent="flex-end">
          <GiftCardOrderStatus order={order} testID="gift-card-order-status" />
        </XStack>
        <GiftCardVisual
          theme={{
            scope_type: GiftCardScopeType.Shop,
            scope_name: '',
            design_name: order.design_name,
          }}
          imageUrl=""
          artworkFrontUrl={order.design_front_url}
          artworkBackUrl={order.design_back_url}
          amountLabel={money(order.amount)}
          minHeight={180}
        />
        <XStack testID="gift-card-order-progress" gap={6} flexWrap="wrap">
          {giftCardOrderSteps(order).map((step) => (
            <Text
              key={step.id}
              fontSize={12}
              fontWeight={step.done ? '700' : '400'}
              color={step.done ? '$primary' : '$muted'}
            >
              {t(step.labelKey)}
            </Text>
          ))}
        </XStack>
        {live ? (
          <Text testID="gift-card-order-live" fontSize={12} color="$muted" textAlign="center">
            {t('mweb.giftCards.orderLiveHint')}
          </Text>
        ) : null}
        <SurfaceCard gap={8}>
          <GiftCardSummaryRow
            testID="gift-card-order-cards"
            label={t('mweb.giftCards.totalCards', {
              vars: { n: order.quantity, amount: money(order.amount) },
            })}
            value={money(order.cards_value)}
          />
          {order.shipping_fee > 0 ? (
            <GiftCardSummaryRow
              testID="gift-card-order-fee"
              label={t('mweb.giftCards.totalDelivery')}
              value={money(order.shipping_fee)}
            />
          ) : null}
          <Separator />
          <GiftCardSummaryRow
            testID="gift-card-order-total"
            bold
            label={t('mweb.giftCards.checkoutTotal')}
            value={money(order.total)}
          />
          {order.recipient_email ? (
            <GiftCardSummaryRow
              testID="gift-card-order-sent-to"
              label={t('mweb.giftCards.sentTo')}
              value={order.recipient_email}
            />
          ) : null}
        </SurfaceCard>
        {order.delivery_mode === 'PHYSICAL' ? <Tracking order={order} /> : null}
      </YStack>
    );
  } else if (failed) {
    body = (
      <Text testID="gift-card-order-error" role="alert" fontSize={13} color="$danger">
        {t('mweb.giftCards.orderNotFound')}
      </Text>
    );
  } else {
    body = (
      <YStack alignItems="center" paddingVertical={32}>
        <Spinner testID="gift-card-order-loading" size="large" color="$primary" />
      </YStack>
    );
  }

  return (
    <StackScreen
      title={t('mweb.giftCards.orderTitle', { vars: { order: orderNo } })}
      testID="gift-card-order-screen"
    >
      <RefreshScrollView showsVerticalScrollIndicator={false}>
        <YStack padding={16} paddingBottom={48}>
          {body}
        </YStack>
      </RefreshScrollView>
    </StackScreen>
  );
}
