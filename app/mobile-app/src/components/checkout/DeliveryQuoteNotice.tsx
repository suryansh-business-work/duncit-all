import { Text, YStack } from 'tamagui';
import { DELIVERY_QUOTE_BLOCK_KEYS, type DeliveryQuoteStatus } from '@duncit/utils';

import { DuncitButton } from '@/components/DuncitButton';
import { useTranslation } from '@/hooks/useTranslation';

/**
 * Why the Pay button is shut while the delivery charge is unknown: a pincode is
 * still needed, the charge is being calculated, or the quote failed — the last
 * with a way to ask again. Announced as it changes; renders nothing once the
 * charge is known. Twin of mWeb's checkout-page/DeliveryQuoteNotice.
 */
export function DeliveryQuoteNotice({
  status,
  onRetry,
}: Readonly<{ status: DeliveryQuoteStatus; onRetry?: () => void }>) {
  const { t } = useTranslation();
  if (status === 'READY') return null;
  if (status === 'FAILED') {
    return (
      <YStack testID="checkout-delivery-failed" gap={8} alignItems="center">
        <Text role="alert" fontSize={14} color="$danger" textAlign="center">
          {t(DELIVERY_QUOTE_BLOCK_KEYS.FAILED)}
        </Text>
        {onRetry ? (
          <DuncitButton
            testID="checkout-delivery-retry"
            label={t('mweb.checkout.deliveryRetry')}
            variant="outline"
            tone="neutral"
            size="sm"
            onPress={onRetry}
          />
        ) : null}
      </YStack>
    );
  }
  return (
    <Text
      testID="checkout-delivery-pending"
      aria-live="polite"
      fontSize={13}
      color="$muted"
      textAlign="center"
    >
      {t(DELIVERY_QUOTE_BLOCK_KEYS[status])}
    </Text>
  );
}
