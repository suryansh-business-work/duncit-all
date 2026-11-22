import { useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import { PRESS_STYLE } from '@duncit/buttons-native';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { PaymentClaimSheet } from './payment-claim/PaymentClaimSheet';

/**
 * "My payment was deducted but booking was not completed." Shown only where
 * the screen grants the claim capability (the pod checkout, with a Duncit
 * payment to file against). The claim sheet mounts per opening. Twin of mWeb's
 * PaymentSupportSection.
 */
export function PaymentSupportSection({ paymentDocId }: Readonly<{ paymentDocId: string }>) {
  const { t } = useTranslation();
  const { color: ink } = useThemeColors();
  const [open, setOpen] = useState(false);
  const label = t('mweb.payment.deductedButton');

  return (
    <YStack
      gap={8}
      paddingTop={12}
      borderTopWidth={1}
      borderColor="$borderColor"
      testID="payment-support-section"
    >
      <Text role="heading" fontSize={14} fontWeight="700" color="$color">
        {t('mweb.payment.supportHeading')}
      </Text>
      <XStack
        pressStyle={PRESS_STYLE.control}
        testID="payment-deducted-open"
        role="button"
        tabIndex={0}
        aria-label={label}
        onPress={() => setOpen(true)}
        alignItems="center"
        gap={10}
        minHeight={48}
        paddingHorizontal={14}
        paddingVertical={10}
        borderRadius={16}
        borderWidth={1}
        borderColor="$borderColor"
      >
        <MaterialIcons name="support-agent" size={20} color={ink} />
        <Text flex={1} fontSize={14} fontWeight="600" color="$color">
          {label}
        </Text>
      </XStack>
      {open ? (
        <PaymentClaimSheet paymentDocId={paymentDocId} onClose={() => setOpen(false)} />
      ) : null}
    </YStack>
  );
}
