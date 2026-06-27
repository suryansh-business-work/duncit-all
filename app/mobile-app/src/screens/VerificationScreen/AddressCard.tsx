import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Spinner, Text, XStack, YStack } from 'tamagui';

import { FormTextField } from '@/components/FormTextField';
import type { AddressInput, Verification } from '@/hooks/useVerifications';
import { useThemeColors } from '@/hooks/useThemeColors';

import { VerificationCard } from './VerificationCard';
import {
  addressSchema,
  blankAddressValues,
  buildAddressInput,
  type AddressValues,
} from './address.form';

interface Props {
  item: Verification;
  busy: boolean;
  onSubmit: (values: AddressInput) => void;
}

function prefill(address: Verification['address']): AddressValues {
  if (!address) return blankAddressValues;
  return {
    line1: address.line1 ?? '',
    line2: address.line2 ?? '',
    city: address.city ?? '',
    state: address.state ?? '',
    pincode: address.pincode ?? '',
    country: address.country ?? '',
  };
}

/** Address verification — structured manual form (State / City / Pincode / line)
 * instead of a document upload. Approved rows are read-only. */
export function AddressCard({ item, busy, onSubmit }: Readonly<Props>) {
  const { onPrimary } = useThemeColors();
  const { control, handleSubmit } = useForm<AddressValues>({
    resolver: zodResolver(addressSchema),
    defaultValues: prefill(item.address),
  });
  const done = item.status === 'APPROVED';

  const submit = handleSubmit((values) => onSubmit(buildAddressInput(values)));

  return (
    <VerificationCard item={item}>
      {done ? null : (
        <YStack gap={12}>
          <FormTextField
            control={control}
            name="state"
            label="State"
            placeholder="e.g. Maharashtra"
          />
          <FormTextField control={control} name="city" label="City" placeholder="e.g. Mumbai" />
          <FormTextField
            control={control}
            name="pincode"
            label="Pincode"
            placeholder="e.g. 400001"
            keyboardType="number-pad"
          />
          <FormTextField
            control={control}
            name="line1"
            label="Address line 1"
            placeholder="House / street"
          />
          <FormTextField
            control={control}
            name="line2"
            label="Address line 2 (optional)"
            placeholder="Apartment, landmark"
          />
          <FormTextField
            control={control}
            name="country"
            label="Country (optional)"
            placeholder="e.g. India"
          />
          <XStack
            testID="verification-submit-address"
            role="button"
            aria-label="Submit address"
            aria-disabled={busy}
            onPress={busy ? undefined : submit}
            alignItems="center"
            justifyContent="center"
            gap={8}
            height={46}
            borderRadius={12}
            backgroundColor="$primary"
            opacity={busy ? 0.6 : 1}
            pressStyle={{ opacity: 0.85 }}
          >
            {busy ? <Spinner testID="address-busy" size="small" color={onPrimary} /> : null}
            <Text fontSize={14} fontWeight="900" color={onPrimary}>
              {item.status === 'NOT_SUBMITTED' ? 'Submit address' : 'Update address'}
            </Text>
          </XStack>
        </YStack>
      )}
    </VerificationCard>
  );
}
