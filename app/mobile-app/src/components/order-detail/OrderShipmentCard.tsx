import { Linking } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import { shipToLines, trackingUrl } from '@duncit/utils';

import { DuncitButton } from '@/components/DuncitButton';
import { ShipmentFact } from '@/components/ShipmentFact';
import type { OrderDetail, OrderNotice } from '@/hooks/useOrderDetail';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { fireAndForget } from '@/utils/fire-and-forget';

function Heading({ children }: Readonly<{ children: string }>) {
  return (
    <Text role="heading" fontSize={14} fontWeight="700" color="$color">
      {children}
    </Text>
  );
}

/** A collected order: the code to show at the counter, and where. */
function PickupBlock({ order }: Readonly<{ order: OrderDetail }>) {
  const { t } = useTranslation();
  return (
    <YStack gap={8} testID="order-pickup">
      <Heading>{t('mweb.orderDetail.pickup')}</Heading>
      <ShipmentFact
        label={t('mweb.orderDetail.pickupCode')}
        value={order.pickup_ref}
        testID="order-pickup-code"
      />
      <ShipmentFact
        label={t('mweb.orderDetail.pickupLocation')}
        value={order.pickup_location_id}
        testID="order-pickup-location"
      />
      <Text fontSize={11.5} color="$muted">
        {t('mweb.orderDetail.pickupHint')}
      </Text>
    </YStack>
  );
}

interface Props {
  order: OrderDetail;
  /** Where "copied" / "could not copy" is said — the app has no toast. */
  onNotice: (notice: OrderNotice) => void;
}

/**
 * How the order reaches the buyer. Shipped: courier, AWB (with copy), the
 * courier's estimate and last status, the public tracking link and the
 * delivery address. Collected: the pickup code and place.
 * RN twin of mWeb's order-detail-page/OrderShipmentCard.
 */
export function OrderShipmentCard({ order, onNotice }: Readonly<Props>) {
  const { t } = useTranslation();
  const { primary } = useThemeColors();
  if (order.fulfilment_method !== 'SHIP') return <PickupBlock order={order} />;

  const sr = order.shiprocket;
  const track = trackingUrl(sr.awb);
  const address = order.shipping_address ? shipToLines(order.shipping_address) : [];
  const copyAwb = () => {
    Clipboard.setStringAsync(sr.awb)
      .then(() => onNotice({ tone: 'success', text: t('mweb.orderDetail.awbCopied') }))
      // No clipboard access: say so — the number stays on screen.
      .catch(() => onNotice({ tone: 'error', text: t('mweb.orderDetail.copyFailed') }));
  };

  return (
    <YStack gap={8} testID="order-shipment">
      <Heading>{t('mweb.orderDetail.shipment')}</Heading>
      {sr.awb ? null : (
        <Text fontSize={13} color="$muted" testID="order-not-shipped">
          {t('mweb.orderDetail.notShippedYet')}
        </Text>
      )}
      <ShipmentFact
        label={t('mweb.orderDetail.courier')}
        value={sr.courier_name}
        testID="order-courier"
      />
      <ShipmentFact label={t('mweb.orderDetail.awb')} value={sr.awb} testID="order-awb" />
      <ShipmentFact
        label={t('mweb.orderDetail.estimatedDelivery')}
        value={sr.etd}
        testID="order-etd"
      />
      <ShipmentFact
        label={t('mweb.orderDetail.courierStatus')}
        value={sr.tracking_status}
        testID="order-courier-status"
      />
      {sr.awb ? (
        <XStack gap={8} flexWrap="wrap">
          <DuncitButton
            label={t('mweb.orderDetail.copyAwb')}
            variant="outline"
            size="sm"
            icon={<MaterialIcons name="content-copy" size={16} color={primary} />}
            testID="order-copy-awb"
            onPress={copyAwb}
          />
          <DuncitButton
            label={t('mweb.orderDetail.trackShipment')}
            variant="outline"
            size="sm"
            icon={<MaterialIcons name="open-in-new" size={16} color={primary} />}
            testID="order-track"
            onPress={() => fireAndForget(Linking.openURL(track))}
          />
        </XStack>
      ) : null}
      {address.length > 0 ? (
        <YStack gap={2} paddingTop={8} testID="order-address">
          <Heading>{t('mweb.orderDetail.deliveryAddress')}</Heading>
          {address.map((line) => (
            <Text key={line} fontSize={13} color="$muted">
              {line}
            </Text>
          ))}
        </YStack>
      ) : null}
    </YStack>
  );
}
