import type { Control } from 'react-hook-form';
import { Text, XStack, YStack } from 'tamagui';

import { FormTextField } from '@/components/FormTextField';
import type { CheckoutFormValues } from './checkout.types';

export interface CheckoutContactFieldsProps {
  control: Control<CheckoutFormValues>;
}

/** "Contact details" section — full name, main contact email, phone. */
export function CheckoutContactFields({ control }: Readonly<CheckoutContactFieldsProps>) {
  return (
    <YStack gap={12}>
      <Text fontSize={12} fontWeight="900" color="$muted" letterSpacing={0.6}>
        CONTACT DETAILS
      </Text>
      <FormTextField control={control} name="full_name" label="Full name" autoCapitalize="words" />
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
            label="Phone number"
            keyboardType="phone-pad"
          />
        </YStack>
      </XStack>
    </YStack>
  );
}
