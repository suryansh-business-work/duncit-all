import { Linking } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { AppImage } from '@/components/AppImage';
import { OrderTrackingTimeline } from './OrderTrackingTimeline';
import {
  buildOrderTimeline,
  formatMoney,
  fulfilmentLabel,
  statusLabel,
  trackingUrl,
  type ProductOrder,
} from '@/utils/product-orders';

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
      <Text fontSize={10.5} fontWeight="800" color={filled ? '$onPrimary' : '$color'}>
        {label}
      </Text>
    </XStack>
  );
}

/** One product order: fulfilment/status chips, line items, the ship/pickup
 * tracking block, then the fulfilment timeline. RN twin of mWeb's
 * PodProductOrderItem. */
export function PodProductOrderItem({ order }: Readonly<{ order: ProductOrder }>) {
  const isShip = order.fulfilment_method === 'SHIP';
  const track = trackingUrl(order.shiprocket.awb);
  const steps = buildOrderTimeline(order);

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
        <Chip label={fulfilmentLabel(order.fulfilment_method)} filled />
        <Chip label={statusLabel(order.fulfilment_status)} />
        <YStack flex={1} />
        <Text fontSize={11} color="$muted">
          #{order.order_no}
        </Text>
      </XStack>

      {order.line_items.map((li) => (
        <XStack key={li.product_id} gap={8} alignItems="center">
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
              <MaterialIcons name="shopping-bag" size={16} color="#9aa0a6" />
            </YStack>
          )}
          <Text flex={1} fontSize={13} color="$color" numberOfLines={1}>
            {li.name} × {li.qty}
          </Text>
          <Text fontSize={13} fontWeight="800" color="$color">
            {formatMoney(order.currency_symbol, li.gross)}
          </Text>
        </XStack>
      ))}

      {isShip ? (
        <YStack gap={4}>
          {order.shiprocket.awb ? (
            <Text fontSize={11} color="$muted">
              AWB {order.shiprocket.awb}
              {order.shiprocket.courier_name ? ` · ${order.shiprocket.courier_name}` : ''}
            </Text>
          ) : null}
          <XStack
            testID={`po-track-${order.id}`}
            role="button"
            aria-label="Track shipment"
            aria-disabled={!track}
            opacity={track ? 1 : 0.5}
            alignItems="center"
            gap={4}
            onPress={() => {
              if (track) Linking.openURL(track).catch(() => {});
            }}
          >
            <MaterialIcons name="open-in-new" size={14} color="#ff4f73" />
            <Text fontSize={12.5} fontWeight="800" color="$primary">
              Track shipment
            </Text>
          </XStack>
        </YStack>
      ) : (
        <Text fontSize={11} color="$muted">
          Pickup code: {order.pickup_ref || '—'}
          {order.pickup_location_id ? ` · ${order.pickup_location_id}` : ''}
        </Text>
      )}

      <OrderTrackingTimeline steps={steps} testID={`pod-order-timeline-${order.id}`} />
    </YStack>
  );
}
