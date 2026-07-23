import { useState } from 'react';
import { Switch } from 'react-native';
import { useController, useFormState, useWatch, type Control } from 'react-hook-form';
import { Text, XStack, YStack } from 'tamagui';

import { Accordion } from '@/components/details/Accordion';
import { FormTextField } from '@/components/FormTextField';
import { AddressFields } from '@/forms/components/AddressFields';
import { FormCheckbox } from '@/forms/components/FormCheckbox';
import { useThemeColors } from '@/hooks/useThemeColors';
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

/** Billing address fields whose validation errors keep the accordion open + red. */
const BILLING_ERROR_FIELDS = [
  'line1',
  'line2',
  'landmark',
  'city',
  'state',
  'pincode',
  'billing_email',
] as const;

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
      backgroundColor="$background"
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

interface BillingBodyProps {
  control: Control<CheckoutFormValues>;
  mainAddress: CheckoutMainAddress | null;
  sameAsMain: boolean;
}

/** Address portion of the Billing accordion: same-as-main toggle + summary/editable
 * when a main address exists, else editable fields + a "save as main" toggle. */
function BillingAddress({ control, mainAddress, sameAsMain }: Readonly<BillingBodyProps>) {
  if (mainAddress?.line1) {
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
          <AddressFields
            control={control}
            names={ADDRESS_NAMES}
            required
            pincodeHint="4–10 digits"
          />
        )}
      </YStack>
    );
  }
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

/** Full Billing accordion body: address block + the optional billing email. */
function BillingBody({ control, mainAddress, sameAsMain }: Readonly<BillingBodyProps>) {
  return (
    <YStack gap={12}>
      <BillingAddress control={control} mainAddress={mainAddress} sameAsMain={sameAsMain} />
      <FormTextField
        control={control}
        name="billing_email"
        label="Billing email (optional)"
        autoCapitalize="none"
        keyboardType="email-address"
        hint="Leave blank to use your contact email."
      />
    </YStack>
  );
}

/** GST accordion body: a switch that reveals the GSTIN input when on. */
function GstBody({ control }: Readonly<{ control: Control<CheckoutFormValues> }>) {
  const { primary } = useThemeColors();
  const { field } = useController({ control, name: 'has_gstin' });
  const hasGstin = !!field.value;
  return (
    <YStack gap={12}>
      <XStack alignItems="center" gap={12}>
        <Text flex={1} fontSize={13.5} color="$color">
          I have a GSTIN (for business invoice)
        </Text>
        <Switch
          testID="billing-has-gstin"
          aria-label="I have a GSTIN"
          value={hasGstin}
          onValueChange={field.onChange}
          trackColor={{ true: primary }}
        />
      </XStack>
      {hasGstin ? (
        <FormTextField
          control={control}
          name="gstin"
          label="GSTIN"
          hint="15-character GSTIN"
          autoCapitalize="characters"
          maxLength={15}
        />
      ) : null}
    </YStack>
  );
}

export interface CheckoutBillingSectionProps {
  control: Control<CheckoutFormValues>;
  mainAddress: CheckoutMainAddress | null;
}

/** Billing + GST as two accordions: "Billing address" (default open, red when its
 * fields error) and "GST details" (default collapsed). */
export function CheckoutBillingSection({
  control,
  mainAddress,
}: Readonly<CheckoutBillingSectionProps>) {
  const sameAsMain = useWatch({ control, name: 'same_as_main' });
  const { errors } = useFormState({ control });
  const [billingOpen, setBillingOpen] = useState(true);
  const [gstOpen, setGstOpen] = useState(false);
  const hasBillingError = BILLING_ERROR_FIELDS.some((name) => !!errors[name]);

  return (
    <YStack>
      <Accordion
        testID="billing-accordion"
        title="Billing address"
        icon="home"
        error={hasBillingError}
        open={billingOpen || hasBillingError}
        onToggle={() => setBillingOpen((open) => !open)}
      >
        <BillingBody control={control} mainAddress={mainAddress} sameAsMain={sameAsMain} />
      </Accordion>
      <Accordion
        testID="gst-accordion"
        title="GST details"
        icon="receipt-long"
        open={gstOpen}
        onToggle={() => setGstOpen((open) => !open)}
      >
        <GstBody control={control} />
      </Accordion>
    </YStack>
  );
}
