import type { Control } from 'react-hook-form';
import { Text, YStack } from 'tamagui';

import { FormTextField } from '@/components/FormTextField';
import { AddressFields } from '@/forms/components/AddressFields';
import { FormCheckbox } from '@/forms/components/FormCheckbox';
import { useTranslation } from '@/hooks/useTranslation';
import type { CheckoutFormValues, CheckoutMainAddress } from '../checkout.types';

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
  /** Show required markers on invoice-address fields. */
  addressRequired: boolean;
}

/** Address portion of the Billing accordion: same-as-main toggle + summary/editable
 * when a main address exists, else editable fields + a "save as main" toggle. */
function BillingAddress({
  control,
  mainAddress,
  sameAsMain,
  addressRequired,
}: Readonly<BillingBodyProps>) {
  const { t } = useTranslation();
  if (mainAddress?.line1) {
    return (
      <YStack gap={12}>
        <FormCheckbox
          control={control}
          name="same_as_main"
          label={t('mweb.checkout.sameAsMain')}
          testID="billing-same-as-main"
        />
        {sameAsMain ? (
          <MainAddressSummary address={mainAddress} />
        ) : (
          <AddressFields
            control={control}
            names={ADDRESS_NAMES}
            required={addressRequired}
            pincodeHint={t('mweb.checkout.pincodeHint')}
          />
        )}
      </YStack>
    );
  }
  return (
    <YStack gap={12}>
      <AddressFields
        control={control}
        names={ADDRESS_NAMES}
        required={addressRequired}
        pincodeHint={t('mweb.checkout.pincodeHint')}
      />
      <FormCheckbox
        control={control}
        name="save_as_main"
        label={t('mweb.checkout.saveAsMain')}
        testID="billing-save-as-main"
      />
    </YStack>
  );
}

/** Full Billing accordion body: address block + the optional billing email. */
export function BillingBody({
  control,
  mainAddress,
  sameAsMain,
  addressRequired,
}: Readonly<BillingBodyProps>) {
  const { t } = useTranslation();
  return (
    <YStack gap={12}>
      <BillingAddress
        control={control}
        mainAddress={mainAddress}
        sameAsMain={sameAsMain}
        addressRequired={addressRequired}
      />
      <FormTextField
        control={control}
        name="billing_email"
        label={t('mweb.checkout.billingEmail')}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
        textContentType="emailAddress"
        hint={t('mweb.checkout.billingEmailHint')}
      />
    </YStack>
  );
}
