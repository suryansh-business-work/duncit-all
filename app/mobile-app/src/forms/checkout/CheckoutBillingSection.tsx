import { useWatch, type Control } from 'react-hook-form';
import { Text, YStack } from 'tamagui';

import { FormTextField } from '@/components/FormTextField';
import { AddressFields } from '@/forms/components/AddressFields';
import { FormCheckbox } from '@/forms/components/FormCheckbox';
import type { CheckoutFormValues, CheckoutMainAddress } from './checkout.types';

const ADDRESS_NAMES = {
  line1: 'line1',
  line2: 'line2',
  landmark: 'landmark',
  city: 'city',
  state: 'state',
  pincode: 'pincode',
  country: 'country',
} as const;

/** Read-only summary of the saved main address (shown when "same as main" is on). */
function MainAddressSummary({ address }: Readonly<{ address: CheckoutMainAddress }>) {
  const secondLine = [address.line2, address.landmark].filter(Boolean).join(', ');
  const cityLine = `${address.city}, ${address.state} - ${address.pincode}`;
  return (
    <YStack
      testID="billing-main-summary"
      gap={2}
      padding={12}
      borderRadius={12}
      backgroundColor="$surface"
      borderWidth={1}
      borderColor="$borderColor"
    >
      <Text fontSize={14} color="$color">
        {address.line1}
      </Text>
      {secondLine ? (
        <Text fontSize={13} color="$muted">
          {secondLine}
        </Text>
      ) : null}
      <Text fontSize={13} color="$muted">
        {cityLine}
      </Text>
      {address.country ? (
        <Text fontSize={13} color="$muted">
          {address.country}
        </Text>
      ) : null}
    </YStack>
  );
}

/** Editable billing address + "save as main" toggle (shown when not same-as-main). */
function BillingEditableFields({ control }: Readonly<{ control: Control<CheckoutFormValues> }>) {
  return (
    <YStack gap={12}>
      <AddressFields control={control} names={ADDRESS_NAMES} />
      <FormCheckbox
        control={control}
        name="save_as_main"
        label="Save this as my main address"
        testID="billing-save-as-main"
      />
    </YStack>
  );
}

interface WithMainProps {
  control: Control<CheckoutFormValues>;
  mainAddress: CheckoutMainAddress;
  sameAsMain: boolean;
}

/** Billing block when a saved main address exists — toggle + summary/editable. */
function BillingWithMain({ control, mainAddress, sameAsMain }: Readonly<WithMainProps>) {
  return (
    <YStack gap={12}>
      <FormCheckbox
        control={control}
        name="same_as_main"
        label="Same as my main address"
        testID="billing-same-as-main"
      />
      {sameAsMain ? (
        <MainAddressSummary address={mainAddress} />
      ) : (
        <BillingEditableFields control={control} />
      )}
    </YStack>
  );
}

export interface CheckoutBillingSectionProps {
  control: Control<CheckoutFormValues>;
  mainAddress: CheckoutMainAddress | null;
}

/** "Billing address" section — same-as-main toggle, editable address (or the
 * saved-address summary), a separate billing email, GSTIN and save-as-main. */
export function CheckoutBillingSection({
  control,
  mainAddress,
}: Readonly<CheckoutBillingSectionProps>) {
  const sameAsMain = useWatch({ control, name: 'same_as_main' });

  return (
    <YStack gap={12}>
      <Text fontSize={12} fontWeight="900" color="$muted" letterSpacing={0.6}>
        BILLING ADDRESS
      </Text>

      {mainAddress?.line1 ? (
        <BillingWithMain control={control} mainAddress={mainAddress} sameAsMain={sameAsMain} />
      ) : (
        <BillingEditableFields control={control} />
      )}

      <FormTextField
        control={control}
        name="billing_email"
        label="Billing email (optional)"
        autoCapitalize="none"
        keyboardType="email-address"
        hint="Leave blank to use your contact email."
      />
      <FormTextField
        control={control}
        name="gstin"
        label="GSTIN (for business invoice)"
        autoCapitalize="characters"
        maxLength={15}
      />
    </YStack>
  );
}
