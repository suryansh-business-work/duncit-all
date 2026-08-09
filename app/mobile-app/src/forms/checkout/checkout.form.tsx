import { useEffect, useMemo } from 'react';
import { useController, useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { PrimaryButton } from '@/components/PrimaryButton';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { CheckoutBillingSection } from './CheckoutBillingSection';
import { CheckoutContactFields } from './CheckoutContactFields';
import {
  checkoutDefaults,
  makeCheckoutSchema,
  makeProductCheckoutSchema,
  type CheckoutContact,
  type CheckoutFormValues,
  type CheckoutMainAddress,
} from './checkout.types';

export interface CheckoutFormProps {
  initialValues?: Partial<CheckoutFormValues>;
  /** The user's saved main address — powers the "same as main" summary/prefill. */
  mainAddress?: CheckoutMainAddress | null;
  /** Contact resolved from the loaded profile — shown in the read-only summary. */
  contact?: CheckoutContact | null;
  /** True while the profile is still loading (contact card shows a spinner). */
  contactLoading?: boolean;
  loading?: boolean;
  errorMessage?: string | null;
  dummyMode?: boolean;
  /**
   * What pressing the button will actually charge. On the button itself, not
   * only in the summary above it — the last thing a buyer reads before paying
   * should be the number, and on a multi-seat booking the summary can have
   * scrolled away. mWeb's button has said this all along (rule 27).
   */
  payLabel?: string;
  /** Deliveries (product checkout) need a billing/delivery address; the pod
   * membership checkout validates the email only and never blocks on a
   * half-filled profile. */
  addressRequired?: boolean;
  /** Notified with the live delivery pincode — the product checkout uses it to
   * fetch a live shipping quote. Omitted by the pod (membership) checkout. */
  onPincodeChange?: (pincode: string) => void;
  onSubmit: (values: CheckoutFormValues) => void | Promise<void>;
}

/** Checkout contact + billing form — RN twin of mWeb's checkout form. */
export function CheckoutForm({
  initialValues,
  mainAddress = null,
  contact = null,
  contactLoading = false,
  loading,
  errorMessage,
  dummyMode = true,
  payLabel,
  addressRequired = false,
  onPincodeChange,
  onSubmit,
}: Readonly<CheckoutFormProps>) {
  const { primary, color } = useThemeColors();
  const { t } = useTranslation();
  // The schemas cannot call `t` at module scope, so they are built here from the
  // reader's own catalogue — the validation messages are copy like any other.
  const schema = useMemo(
    () => (addressRequired ? makeProductCheckoutSchema(t) : makeCheckoutSchema(t)),
    [addressRequired, t],
  );
  const { control, handleSubmit } = useForm<CheckoutFormValues>({
    values: { ...checkoutDefaults, ...initialValues },
    resolver: zodResolver(schema),
    mode: 'onBlur',
  });
  const simulate = useController({ control, name: 'simulate_failure' });
  const pincode = useWatch({ control, name: 'pincode' });
  useEffect(() => {
    onPincodeChange?.(pincode);
  }, [pincode, onPincodeChange]);

  return (
    <YStack gap={16}>
      <CheckoutContactFields control={control} contact={contact} loading={contactLoading} />
      <CheckoutBillingSection
        control={control}
        mainAddress={mainAddress}
        addressRequired={addressRequired}
      />

      {dummyMode ? (
        <XStack
          testID="simulate-failure"
          role="switch"
          aria-checked={simulate.field.value}
          onPress={() => simulate.field.onChange(!simulate.field.value)}
          alignItems="center"
          gap={10}
          pressStyle={{ opacity: 0.8 }}
        >
          <MaterialIcons
            name={simulate.field.value ? 'check-box' : 'check-box-outline-blank'}
            size={22}
            color={simulate.field.value ? primary : color}
          />
          <Text fontSize={13} color="$muted">
            Simulate a payment failure (testing)
          </Text>
        </XStack>
      ) : null}

      {errorMessage ? (
        <Text testID="checkout-error" fontSize={14} color="$danger">
          {errorMessage}
        </Text>
      ) : null}

      <PrimaryButton
        testID="checkout-submit"
        label={loading ? t('mweb.checkout.processing') : (payLabel ?? t('mweb.checkout.payNow'))}
        loading={loading}
        onPress={handleSubmit(onSubmit)}
      />
      <Text fontSize={11} color="$muted" textAlign="center">
        {dummyMode ? t('mweb.checkout.dummyGatewayNote') : t('mweb.checkout.razorpayNote')}
      </Text>
    </YStack>
  );
}
