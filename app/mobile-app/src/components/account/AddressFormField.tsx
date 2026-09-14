import type { TextInputProps } from 'react-native';
import { Controller, type Control } from 'react-hook-form';
import { Input, Text, YStack } from 'tamagui';

import type { AddressFormValues } from './AddressFormSheet';

type Autofill = Pick<TextInputProps, 'autoComplete' | 'textContentType'>;

/**
 * What each address box is, told to the OS autofill (WCAG 1.3.5) — the same
 * purposes mWeb's address dialog declares with `autoComplete`.
 */
const AUTOFILL: Partial<Record<keyof AddressFormValues, Autofill>> = {
  name: { autoComplete: 'name', textContentType: 'name' },
  phone: { autoComplete: 'tel', textContentType: 'telephoneNumber' },
  line1: { autoComplete: 'address-line1', textContentType: 'streetAddressLine1' },
  line2: { autoComplete: 'address-line2', textContentType: 'streetAddressLine2' },
  city: { autoComplete: 'postal-address-locality', textContentType: 'addressCity' },
  state: { autoComplete: 'postal-address-region', textContentType: 'addressState' },
  pincode: { autoComplete: 'postal-code', textContentType: 'postalCode' },
  country: { autoComplete: 'country', textContentType: 'countryName' },
};

interface Props {
  name: keyof AddressFormValues;
  label: string;
  control: Control<AddressFormValues>;
}

/** One labelled box of the saved-address sheet, with its error line. */
export function AddressFormField({ name, label, control }: Readonly<Props>) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field, fieldState }) => (
        <YStack gap={4}>
          <Text fontSize={11.5} fontWeight="600" color="$muted">
            {label}
          </Text>
          <Input
            testID={`address-${name}`}
            aria-label={label}
            {...AUTOFILL[name]}
            value={field.value}
            onChangeText={field.onChange}
            onBlur={field.onBlur}
            borderRadius={12}
            borderColor={fieldState.error ? '$danger' : '$inputBorder'}
          />
          {fieldState.error ? (
            <Text fontSize={11} color="$danger" role="alert" testID={`address-${name}-error`}>
              {fieldState.error.message}
            </Text>
          ) : null}
        </YStack>
      )}
    />
  );
}
