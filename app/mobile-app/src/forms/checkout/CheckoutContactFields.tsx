import { useWatch, type Control } from 'react-hook-form';
import { Spinner, Text, XStack, YStack } from 'tamagui';

import type { CheckoutContact, CheckoutFormValues } from './checkout.types';

export interface CheckoutContactFieldsProps {
  control: Control<CheckoutFormValues>;
  /** Contact resolved from the loaded profile — rendered directly so the card
   * doesn't depend solely on the form-prefill timing (falls back to form state). */
  contact?: CheckoutContact | null;
  /** True while the profile is still loading — shows a spinner instead of blanks. */
  loading?: boolean;
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

/** "Contact details" section — a READ-ONLY summary. The name/email/phone come
 * from the loaded profile (rendered directly, falling back to the form prefill
 * which is still what gets sent on pay) and can only be changed from the
 * profile. While the profile is still loading a spinner shows instead of blanks. */
export function CheckoutContactFields({
  control,
  contact,
  loading,
}: Readonly<CheckoutContactFieldsProps>) {
  const [fullName, email, phoneExtension, phoneNumber] = useWatch({
    control,
    name: ['full_name', 'email', 'phone_extension', 'phone_number'],
  });
  const displayName = contact?.name || fullName;
  const displayEmail = contact?.email || email;
  const ext = contact?.phone_extension || phoneExtension;
  const num = contact?.phone_number || phoneNumber;
  const phone = [ext, num].filter(Boolean).join(' ');

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
        {loading ? (
          <XStack testID="checkout-contact-loading" alignItems="center" gap={8}>
            <Spinner color="$primary" />
            <Text fontSize={13} color="$muted">
              Loading your details…
            </Text>
          </XStack>
        ) : (
          <>
            <SummaryRow label="Name" value={displayName} />
            <SummaryRow label="Email" value={displayEmail} />
            <SummaryRow label="Phone" value={phone} />
          </>
        )}
      </YStack>
      <Text fontSize={12} color="$muted">
        To change these, edit your profile.
      </Text>
    </YStack>
  );
}
