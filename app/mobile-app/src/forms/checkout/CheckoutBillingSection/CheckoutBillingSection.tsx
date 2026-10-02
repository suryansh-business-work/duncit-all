import { useState } from 'react';
import { useFormState, useWatch, type Control } from 'react-hook-form';
import { YStack } from 'tamagui';

import { Accordion } from '@/components/details/Accordion';
import { useTranslation } from '@/hooks/useTranslation';
import type { CheckoutFormValues, CheckoutMainAddress } from '../checkout.types';

import { BillingBody } from './BillingBody';
import { GstBody } from './GstBody';

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

export interface CheckoutBillingSectionProps {
  control: Control<CheckoutFormValues>;
  mainAddress: CheckoutMainAddress | null;
  addressRequired?: boolean;
}

/** Billing + GST as two accordions: "Billing address" (default open, red when its
 * fields error) and "GST details" (default collapsed). */
export function CheckoutBillingSection({
  control,
  mainAddress,
  addressRequired = false,
}: Readonly<CheckoutBillingSectionProps>) {
  const { t } = useTranslation();
  const sameAsMain = useWatch({ control, name: 'same_as_main' });
  const { errors } = useFormState({ control });
  const [billingOpen, setBillingOpen] = useState(true);
  const [gstOpen, setGstOpen] = useState(false);
  const hasBillingError = BILLING_ERROR_FIELDS.some((name) => !!errors[name]);

  return (
    <YStack>
      <Accordion
        testID="billing-accordion"
        title={t('mweb.checkout.billingAddress')}
        icon="home"
        error={hasBillingError}
        open={billingOpen || hasBillingError}
        onToggle={() => setBillingOpen((open) => !open)}
      >
        <BillingBody
          control={control}
          mainAddress={mainAddress}
          sameAsMain={sameAsMain}
          addressRequired={addressRequired}
        />
      </Accordion>
      <Accordion
        testID="gst-accordion"
        title={t('mweb.checkout.gstDetails')}
        icon="receipt-long"
        open={gstOpen}
        onToggle={() => setGstOpen((open) => !open)}
      >
        <GstBody control={control} />
      </Accordion>
    </YStack>
  );
}
