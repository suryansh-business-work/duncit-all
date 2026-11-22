import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

/** The registered contact support will reach the buyer on; '' when the account has none. */
export interface PaymentClaimContact {
  phone: string;
  email: string;
}

interface RowProps {
  icon: 'phone' | 'mail-outline';
  label: string;
  value: string;
  testID: string;
}

function ContactRow({ icon, label, value, testID }: Readonly<RowProps>) {
  const { t } = useTranslation();
  const { muted } = useThemeColors();
  return (
    <XStack alignItems="center" gap={8} testID={testID}>
      <MaterialIcons name={icon} size={16} color={muted} />
      <Text fontSize={13} color="$muted">
        {label}
      </Text>
      <Text
        flexShrink={1}
        numberOfLines={1}
        fontSize={13}
        fontWeight="600"
        color={value ? '$color' : '$muted'}
      >
        {value || t('mweb.payment.claim.missingContact')}
      </Text>
    </XStack>
  );
}

/** Where support will reach the buyer: the account's registered phone and email. */
export function ClaimContactFooter({ contact }: Readonly<{ contact: PaymentClaimContact }>) {
  const { t } = useTranslation();
  return (
    <YStack
      gap={6}
      padding={12}
      borderRadius={16}
      backgroundColor="$soft"
      testID="payment-claim-contact"
    >
      <Text fontSize={12} color="$muted">
        {t('mweb.payment.claim.contactNotice')}
      </Text>
      <ContactRow
        icon="phone"
        label={t('mweb.payment.claim.phoneLabel')}
        value={contact.phone}
        testID="payment-claim-phone"
      />
      <ContactRow
        icon="mail-outline"
        label={t('mweb.payment.claim.emailLabel')}
        value={contact.email}
        testID="payment-claim-email"
      />
    </YStack>
  );
}
