import { useController, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { FormTextField } from '@/components/FormTextField';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useThemeColors } from '@/hooks/useThemeColors';
import {
  CHECKOUT_PAYMENT_METHODS,
  checkoutDefaults,
  checkoutSchema,
  type CheckoutFormValues,
} from './checkout.types';

export interface CheckoutFormProps {
  initialValues?: Partial<CheckoutFormValues>;
  loading?: boolean;
  errorMessage?: string | null;
  dummyMode?: boolean;
  onSubmit: (values: CheckoutFormValues) => void | Promise<void>;
}

/** Checkout contact + payment-method form — RN twin of mWeb's checkout form. */
export function CheckoutForm({
  initialValues,
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
  const method = useController({ control, name: 'method' });
  const simulate = useController({ control, name: 'simulate_failure' });

  return (
    <YStack gap={14}>
      <FormTextField
        control={control}
        name="email"
        label="Email"
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <XStack gap={12}>
        <YStack width={96}>
          <FormTextField
            control={control}
            name="phone_extension"
            label="Code"
            keyboardType="phone-pad"
          />
        </YStack>
        <YStack flex={1}>
          <FormTextField
            control={control}
            name="phone_number"
            label="Phone"
            keyboardType="phone-pad"
          />
        </YStack>
      </XStack>
      <FormTextField
        control={control}
        name="billing_address"
        label="Billing address"
        multiline
        numberOfLines={2}
      />

      <YStack gap={6}>
        <Text fontSize={14} fontWeight="500" color="$color">
          Payment method
        </Text>
        <XStack flexWrap="wrap" gap={8}>
          {CHECKOUT_PAYMENT_METHODS.map((m) => {
            const on = method.field.value === m.value;
            return (
              <XStack
                key={m.value}
                testID={`pay-method-${m.value}`}
                role="button"
                aria-label={m.label}
                aria-pressed={on}
                onPress={() => method.field.onChange(m.value)}
                paddingHorizontal={12}
                paddingVertical={8}
                borderRadius={999}
                backgroundColor={on ? '$primary' : '$surface'}
                borderWidth={1}
                borderColor={on ? '$primary' : '$borderColor'}
                pressStyle={{ opacity: 0.85 }}
              >
                <Text fontSize={12.5} fontWeight="800" color={on ? '$onPrimary' : '$color'}>
                  {m.label}
                </Text>
              </XStack>
            );
          })}
        </XStack>
      </YStack>

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
