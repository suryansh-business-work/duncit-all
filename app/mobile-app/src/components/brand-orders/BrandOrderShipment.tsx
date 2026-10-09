import { Linking } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import { PRESS_STYLE } from '@duncit/buttons-native';
import { shiprocketOrderUrl, trackingUrl } from '@duncit/utils';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import type { BrandOrder } from '@/hooks/useBrandOrder';
import { fireAndForget } from '@/utils/fire-and-forget';

function Fact({
  label,
  value,
  testID,
}: Readonly<{ label: string; value: string; testID: string }>) {
  if (!value) return null;
  return (
    <XStack justifyContent="space-between" gap={8}>
      <Text fontSize={13} color="$muted">
        {label}
      </Text>
      <Text
        fontSize={13}
        fontWeight="600"
        color="$color"
        testID={testID}
        flexShrink={1}
        textAlign="right"
      >
        {value}
      </Text>
    </XStack>
  );
}

function OutLink({ url, label, testID }: Readonly<{ url: string; label: string; testID: string }>) {
  const { primary } = useThemeColors();
  return (
    <XStack
      testID={testID}
      role="link"
      aria-label={label}
      tabIndex={0}
      pressStyle={PRESS_STYLE.surface}
      alignItems="center"
      gap={4}
      minHeight={36}
      onPress={() => fireAndForget(Linking.openURL(url))}
    >
      <MaterialIcons name="open-in-new" size={14} color={primary} />
      <Text fontSize={13} fontWeight="600" color="$accent">
        {label}
      </Text>
    </XStack>
  );
}

/**
 * Where the shipment stands: the ShipRocket order and shipment ids, courier,
 * AWB, expected delivery, pickup date and the courier's last status, with the
 * public tracking link and the order in the brand's own ShipRocket account —
 * and, when a booking stopped, why, in plain view. RN twin of mWeb's BrandOrderShipment.
 */
export function BrandOrderShipment({ order }: Readonly<{ order: BrandOrder }>) {
  const { t } = useTranslation();
  if (order.fulfilment_method !== 'SHIP') {
    return (
      <Text fontSize={13} color="$muted" testID="brand-order-pickup">
        {t('mweb.brandOrders.pickupOrder')}
      </Text>
    );
  }
  const sr = order.shiprocket;
  const track = trackingUrl(sr.awb);
  const inShiprocket = shiprocketOrderUrl(sr.order_id);
  return (
    <YStack gap={8} testID="brand-order-shipment">
      {order.last_error ? (
        <Text
          role="alert"
          fontSize={13}
          color="$danger"
          backgroundColor="$dangerSoft"
          padding={10}
          borderRadius={10}
          testID="brand-order-last-error"
        >
          {t('mweb.brandOrders.bookingFailed', { vars: { error: order.last_error } })}
        </Text>
      ) : null}
      {!sr.order_id && !sr.awb ? (
        <Text fontSize={13} color="$muted" testID="brand-order-not-booked">
          {t('mweb.brandOrders.notBooked')}
        </Text>
      ) : null}
      <Fact
        label={t('mweb.brandOrders.shiprocketOrderId')}
        value={sr.order_id}
        testID="brand-order-sr-order"
      />
      <Fact
        label={t('mweb.brandOrders.shipmentId')}
        value={sr.shipment_id}
        testID="brand-order-sr-shipment"
      />
      <Fact label={t('mweb.brandOrders.awbLabel')} value={sr.awb} testID="brand-order-awb" />
      <Fact
        label={t('mweb.brandOrders.courier')}
        value={sr.courier_name}
        testID="brand-order-courier"
      />
      <Fact label={t('mweb.brandOrders.etd')} value={sr.etd} testID="brand-order-etd" />
      <Fact
        label={t('mweb.brandOrders.pickupScheduled')}
        value={sr.pickup_scheduled_date}
        testID="brand-order-pickup-date"
      />
      <Fact
        label={t('mweb.brandOrders.trackingStatus')}
        value={sr.tracking_status}
        testID="brand-order-tracking"
      />
      {track ? (
        <OutLink
          url={track}
          label={t('mweb.brandOrders.trackShipment')}
          testID="brand-order-track"
        />
      ) : null}
      {inShiprocket ? (
        <YStack gap={2}>
          <OutLink
            url={inShiprocket}
            label={t('mweb.brandOrders.openInShiprocket')}
            testID="brand-order-open-shiprocket"
          />
          <Text fontSize={12} color="$muted">
            {t('mweb.brandOrders.openInShiprocketHint')}
          </Text>
        </YStack>
      ) : null}
    </YStack>
  );
}
