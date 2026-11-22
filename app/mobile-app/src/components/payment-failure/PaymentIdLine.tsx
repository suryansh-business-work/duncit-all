import { useState } from 'react';
import * as Clipboard from 'expo-clipboard';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import { logs } from '@duncit/logs';
import { PRESS_STYLE } from '@duncit/buttons-native';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

/**
 * Razorpay's payment id — selectable and copyable — the reference a buyer
 * reads out to their bank or quotes in a deduction claim. Twin of mWeb's
 * PaymentIdLine (rule 27).
 */
export function PaymentIdLine({ paymentId }: Readonly<{ paymentId: string }>) {
  const { t } = useTranslation();
  const { muted } = useThemeColors();
  const [copied, setCopied] = useState(false);

  const copy = () => {
    Clipboard.setStringAsync(paymentId)
      .then(() => setCopied(true))
      .catch((error: unknown) => {
        logs.mobileApp.warn('PaymentFailure', 'copyTransactionId', { error });
        setCopied(false);
      });
  };

  return (
    <YStack alignItems="center" gap={2} testID="payment-transaction-id">
      <XStack alignItems="center" gap={6} maxWidth="100%">
        <Text
          selectable
          flexShrink={1}
          fontSize={13}
          fontWeight="600"
          color="$color"
          textAlign="center"
        >
          {t('mweb.payment.transactionIdLabel', { vars: { id: paymentId } })}
        </Text>
        <XStack
          pressStyle={PRESS_STYLE.control}
          testID="payment-transaction-id-copy"
          role="button"
          tabIndex={0}
          aria-label={t('mweb.payment.copyTransactionId')}
          hitSlop={11}
          padding={4}
          borderRadius={999}
          onPress={copy}
        >
          <MaterialIcons name="content-copy" size={16} color={muted} />
        </XStack>
      </XStack>
      {copied ? (
        <Text
          testID="payment-transaction-id-copied"
          aria-live="polite"
          fontSize={11}
          color="$success"
        >
          {t('mweb.payment.transactionIdCopied')}
        </Text>
      ) : null}
    </YStack>
  );
}
