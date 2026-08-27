import { Linking } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { AppImage } from '@/components/AppImage';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { OrderTrackingTimeline } from './OrderTrackingTimeline';
import {
  buildOrderTimeline,
  formatMoney,
  fulfilmentLabel,
  statusLabel,
  trackingUrl,
} from '@duncit/utils';
import type { ProductOrder } from '@/utils/product-orders';
import { PRESS_STYLE } from '@duncit/buttons-native';

function Chip({ label, filled }: Readonly<{ label: string; filled?: boolean }>) {
  return (
    <XStack
      borderRadius={999}
      paddingHorizontal={9}
      paddingVertical={3}
      backgroundColor={filled ? '$primary' : '$surface'}
      borderWidth={filled ? 0 : 1}
      borderColor="$borderColor"
    >
      <Text fontSize={10.5} fontWeight="600" color={filled ? '$onPrimary' : '$color'}>
        {label}
      </Text>
    </XStack>
  );
}

/** One product order: fulfilment/status chips, line items, the ship/pickup
 * tracking block, then the fulfilment timeline. RN twin of mWeb's
 * PodProductOrderItem. */
export function PodProductOrderItem({ order }: Readonly<{ order: ProductOrder }>) {
  const { muted, primary } = useThemeColors();
  const { t } = useTranslation();
  const isShip = order.fulfilment_method === 'SHIP';
  const track = trackingUrl(order.shiprocket.awb);
  const steps = buildOrderTimeline(order, t);

  return (
    <YStack
      testID={`po-item-${order.id}`}
      borderWidth={1}
      borderColor="$borderColor"
      borderRadius={14}
      padding={12}
      gap={8}
    >
      <XStack gap={6} alignItems="center" flexWrap="wrap">
        <Chip label={fulfilmentLabel(order.fulfilment_method, t)} filled />
        <Chip label={statusLabel(order.fulfilment_status, t)} />
        <YStack flex={1} />
        <Text fontSize={11} color="$muted">
          #{order.order_no}
        </Text>
      </XStack>

      {order.line_items.map((li) => (
        <XStack key={`${li.product_id}-${li.variant_id || 'base'}`} gap={8} alignItems="center">
          {li.image_url ? (
            <AppImage
              source={{ uri: li.image_url }}
              style={{ width: 34, height: 34, borderRadius: 8 }}
            />
          ) : (
            <YStack
              width={34}
              height={34}
              borderRadius={8}
              backgroundColor="$surface"
              alignItems="center"
              justifyContent="center"
            >
              <MaterialIcons name="shopping-bag" size={16} color={muted} />
            </YStack>
          )}
          <Text flex={1} fontSize={13} color="$color" numberOfLines={1}>
            {li.name}
            {li.variant_label ? ` — ${li.variant_label}` : ''} × {li.qty}
          </Text>
          <Text fontSize={13} fontWeight="600" color="$color">
            {formatMoney(li.gross, { symbol: order.currency_symbol })}
          </Text>
        </XStack>
      ))}

      {isShip ? (
        <YStack gap={4}>
          {order.shiprocket.awb ? (
            <Text fontSize={11} color="$muted">
              {t('mweb.podHistory.awb', { vars: { awb: order.shiprocket.awb } })}
              {order.shiprocket.courier_name ? ` · ${order.shiprocket.courier_name}` : ''}
            </Text>
          ) : null}
          <XStack
            pressStyle={PRESS_STYLE.surface}
            testID={`po-track-${order.id}`}
            role="button"
            aria-label={t('mweb.podHistory.trackShipment')}
            aria-disabled={!track}
            opacity={track ? 1 : 0.5}
            alignItems="center"
            gap={4}
            onPress={() => {
              if (track) Linking.openURL(track).catch(() => {});
            }}
          >
            <MaterialIcons name="open-in-new" size={14} color={primary} />
            <Text fontSize={12.5} fontWeight="600" color="$primary">
              {t('mweb.podHistory.trackShipment')}
            </Text>
          </XStack>
        </YStack>
      ) : (
        <Text fontSize={11} color="$muted">
          {t('mweb.podHistory.pickupCode')} {order.pickup_ref || '—'}
          {order.pickup_location_id ? ` · ${order.pickup_location_id}` : ''}
        </Text>
      )}

      <OrderTrackingTimeline steps={steps} testID={`pod-order-timeline-${order.id}`} />
    </YStack>
  );
}
