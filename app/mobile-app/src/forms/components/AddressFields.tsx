import type { Control, FieldValues, Path } from 'react-hook-form';
import { XStack, YStack } from 'tamagui';

import { FormTextField } from '@/components/FormTextField';

/** The seven postal-address field names this component binds to on the form. */
export interface AddressFieldNames<T extends FieldValues> {
  line1: Path<T>;
  line2: Path<T>;
  landmark: Path<T>;
  city: Path<T>;
  state: Path<T>;
  pincode: Path<T>;
  country: Path<T>;
}

export interface AddressFieldsProps<T extends FieldValues> {
  control: Control<T>;
  names: AddressFieldNames<T>;
  /** Show the required `*` on line1/city/state/pincode (checkout billing). */
  required?: boolean;
  /** Format hint under the pincode field (varies by form's pincode rule). */
  pincodeHint?: string;
}

/**
 * Reusable RHF-bound postal-address block (line1/line2/landmark/city/state/
 * pincode/country) shared by checkout billing and the account main-address
 * section. Field names are passed in so both forms can reuse it without
 * clashing. RN twin of mWeb's AddressFields.
 */
export function AddressFields<T extends FieldValues>({
  control,
  names,
  required = false,
  pincodeHint,
}: Readonly<AddressFieldsProps<T>>) {
  return (
    <YStack gap={12}>
      <FormTextField
        control={control}
        name={names.line1}
        label="Address line 1"
        required={required}
      />
      <FormTextField control={control} name={names.line2} label="Address line 2 (optional)" />
      <FormTextField control={control} name={names.landmark} label="Landmark (optional)" />
      <XStack gap={12}>
        <YStack flex={1}>
          <FormTextField control={control} name={names.city} label="City" required={required} />
        </YStack>
        <YStack flex={1}>
          <FormTextField control={control} name={names.state} label="State" required={required} />
        </YStack>
      </XStack>
      <XStack gap={12}>
        <YStack flex={1}>
          <FormTextField
            control={control}
            name={names.pincode}
            label="Pincode"
            required={required}
            hint={pincodeHint}
            keyboardType="number-pad"
            maxLength={10}
          />
        </YStack>
        <YStack flex={1}>
          <FormTextField control={control} name={names.country} label="Country" />
        </YStack>
      </XStack>
    </YStack>
  );
}
