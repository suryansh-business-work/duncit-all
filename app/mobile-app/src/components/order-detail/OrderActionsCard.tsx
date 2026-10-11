import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import { orderDownloads } from '@duncit/utils';

import { DuncitButton } from '@/components/DuncitButton';
import type { OrderDetail, OrderDownloadKind } from '@/hooks/useOrderDetail';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  order: OrderDetail;
  /** The document being fetched right now, if any. */
  downloading: OrderDownloadKind | null;
  onInvoice: () => void;
  onSellerInvoice: () => void;
  onHelp: () => void;
}

/**
 * What the buyer can take away from an order: Duncit's invoice, the seller's
 * tax invoice once the shipment is booked, and a support ticket already filled
 * in with the order's references. RN twin of mWeb's order-detail-page/OrderActionsCard.
 */
export function OrderActionsCard({
  order,
  downloading,
  onInvoice,
  onSellerInvoice,
  onHelp,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const { primary, onPrimary } = useThemeColors();
  const offered = orderDownloads(order);
  const busy = downloading !== null;
  const downloadIcon = <MaterialIcons name="download" size={16} color={primary} />;

  return (
    <YStack gap={14} testID="order-actions">
      <YStack gap={8}>
        <Text role="heading" fontSize={14} fontWeight="700" color="$color">
          {t('mweb.orderDetail.documents')}
        </Text>
        <XStack gap={8} flexWrap="wrap">
          {offered.invoice ? (
            <DuncitButton
              label={t('mweb.orderDetail.downloadInvoice')}
              variant="outline"
              size="sm"
              icon={downloadIcon}
              loading={downloading === 'invoice'}
              disabled={busy}
              testID="order-download-invoice"
              onPress={onInvoice}
            />
          ) : null}
          {offered.sellerInvoice ? (
            <DuncitButton
              label={t('mweb.orderDetail.downloadSellerInvoice')}
              variant="outline"
              size="sm"
              icon={downloadIcon}
              loading={downloading === 'sellerInvoice'}
              disabled={busy}
              testID="order-download-seller-invoice"
              onPress={onSellerInvoice}
            />
          ) : null}
        </XStack>
        {order.fulfilment_method === 'SHIP' && !offered.sellerInvoice && !order.cancelled_at ? (
          <Text fontSize={11.5} color="$muted" testID="order-seller-invoice-pending">
            {t('mweb.orderDetail.sellerInvoicePending')}
          </Text>
        ) : null}
      </YStack>
      <YStack gap={8} alignItems="flex-start">
        <Text role="heading" fontSize={14} fontWeight="700" color="$color">
          {t('mweb.orderDetail.needHelp')}
        </Text>
        <DuncitButton
          label={t('mweb.orderDetail.getHelp')}
          icon={<MaterialIcons name="support-agent" size={18} color={onPrimary} />}
          testID="order-get-help"
          onPress={onHelp}
        />
      </YStack>
    </YStack>
  );
}
