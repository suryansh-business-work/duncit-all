import { useController, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { PrimaryButton } from '@/components/PrimaryButton';
import { useThemeColors } from '@/hooks/useThemeColors';
import { CheckoutBillingSection } from './CheckoutBillingSection';
import { CheckoutContactFields } from './CheckoutContactFields';
import {
  checkoutDefaults,
  checkoutSchema,
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
  onSubmit,
}: Readonly<CheckoutFormProps>) {
  const { primary, color } = useThemeColors();
  const { control, handleSubmit } = useForm<CheckoutFormValues>({
    values: { ...checkoutDefaults, ...initialValues },
    resolver: zodResolver(checkoutSchema),
    mode: 'onBlur',
  });
  const simulate = useController({ control, name: 'simulate_failure' });

  return (
    <YStack gap={16}>
      <CheckoutContactFields control={control} contact={contact} loading={contactLoading} />
      <CheckoutBillingSection control={control} mainAddress={mainAddress} />

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
        label={loading ? 'Processing…' : 'Pay now'}
        loading={loading}
        onPress={handleSubmit(onSubmit)}
      />
      <Text fontSize={11} color="$muted" textAlign="center">
        {dummyMode ? 'Dummy gateway — no real money is charged.' : 'Payments secured by Razorpay.'}
      </Text>
    </YStack>
  );
}
