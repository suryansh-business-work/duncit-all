import type { Control, FieldValues, Path } from 'react-hook-form';
import { XStack, YStack } from 'tamagui';

import { FormTextField } from '@/components/FormTextField';
import { useTranslation } from '@/hooks/useTranslation';

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
  const { t } = useTranslation();
  return (
    <YStack gap={12}>
      <FormTextField
        control={control}
        name={names.line1}
        label={t('mweb.address.line1')}
        required={required}
      />
      <FormTextField control={control} name={names.line2} label={t('mweb.address.line2')} />
      <FormTextField control={control} name={names.landmark} label={t('mweb.address.landmark')} />
      <XStack gap={12}>
        <YStack flex={1}>
          <FormTextField
            control={control}
            name={names.city}
            label={t('mweb.address.city')}
            required={required}
          />
        </YStack>
        <YStack flex={1}>
          <FormTextField
            control={control}
            name={names.state}
            label={t('mweb.address.state')}
            required={required}
          />
        </YStack>
      </XStack>
      <XStack gap={12}>
        <YStack flex={1}>
          <FormTextField
            control={control}
            name={names.pincode}
            label={t('mweb.address.pincode')}
            required={required}
            hint={pincodeHint}
            keyboardType="number-pad"
            maxLength={10}
          />
        </YStack>
        <YStack flex={1}>
          <FormTextField control={control} name={names.country} label={t('mweb.address.country')} />
        </YStack>
      </XStack>
    </YStack>
  );
}
