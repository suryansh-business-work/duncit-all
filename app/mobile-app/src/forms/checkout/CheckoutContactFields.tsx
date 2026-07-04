import { useWatch, type Control } from 'react-hook-form';
import { Text, XStack, YStack } from 'tamagui';

import type { CheckoutFormValues } from './checkout.types';

export interface CheckoutContactFieldsProps {
  control: Control<CheckoutFormValues>;
}

/** One "label · value" row in the read-only contact summary. */
function SummaryRow({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <XStack justifyContent="space-between" alignItems="center" gap={12}>
      <Text fontSize={13} color="$muted">
        {label}
      </Text>
      <Text
        flex={1}
        fontSize={13.5}
        fontWeight="700"
        color="$color"
        textAlign="right"
        numberOfLines={1}
      >
        {value}
      </Text>
    </XStack>
  );
}

/** "Contact details" section — now a READ-ONLY summary. The name/email/phone are
 * taken from the profile prefill (still kept in form state + sent on pay) and can
 * only be changed from the user's profile. */
export function CheckoutContactFields({ control }: Readonly<CheckoutContactFieldsProps>) {
  const [fullName, email, phoneExtension, phoneNumber] = useWatch({
    control,
    name: ['full_name', 'email', 'phone_extension', 'phone_number'],
  });
  const phone = [phoneExtension, phoneNumber].filter(Boolean).join(' ');

  return (
    <YStack gap={10}>
      <Text fontSize={12} fontWeight="900" color="$muted" letterSpacing={0.6}>
        CONTACT DETAILS
      </Text>
      <YStack
        testID="checkout-contact-summary"
        gap={8}
        padding={12}
        borderRadius={12}
        backgroundColor="$surface"
        borderWidth={1}
        borderColor="$borderColor"
      >
        <SummaryRow label="Name" value={fullName} />
        <SummaryRow label="Email" value={email} />
        <SummaryRow label="Phone" value={phone} />
      </YStack>
      <Text fontSize={12} color="$muted">
        To change these, edit your profile.
      </Text>
    </YStack>
  );
}
