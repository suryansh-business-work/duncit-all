import { Controller, useWatch, type Control } from 'react-hook-form';
import { Text, YStack } from 'tamagui';
import type { FoodCouponFormValues } from '@duncit/forms/schemas';

import { DuncitButton } from '@/components/DuncitButton';
import { ToggleRow } from '@/components/ToggleRow';
import { DateTimePickerField } from '@/components/venue-availability/DateTimePickerField';
import { useTranslation } from '@/hooks/useTranslation';

interface FieldProps {
  control: Control<FoodCouponFormValues>;
}

interface DateProps extends FieldProps {
  name: 'valid_from' | 'valid_until';
  label: string;
  hint: string;
}

/**
 * One end of the coupon's window, picked with a time and shown in the admin's
 * format; clearing it means "no limit on this side". The twin of the web
 * form's clearable DateTimePicker.
 */
export function FoodCouponDateField({ control, name, label, hint }: Readonly<DateProps>) {
  const { t } = useTranslation();
  const validFrom = useWatch({ control, name: 'valid_from' });
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <YStack gap={4}>
          <DateTimePickerField
            label={label}
            hint={hint}
            value={field.value}
            onChange={field.onChange}
            minDateTime={name === 'valid_until' ? validFrom : null}
            withTime
            testID={`food-coupon-${name}`}
          />
          {field.value ? (
            <DuncitButton
              testID={`food-coupon-${name}-clear`}
              label={t('venueFoodOwner.coupons.clearDate', { vars: { field: label } })}
              variant="ghost"
              size="sm"
              onPress={() => field.onChange(null)}
            />
          ) : null}
          {fieldState.error ? (
            <Text role="alert" fontSize={12} color="$danger">
              {fieldState.error.message}
            </Text>
          ) : null}
        </YStack>
      )}
    />
  );
}

/** Whether guests can use the code right now — the same switch each coupon card carries. */
export function FoodCouponActiveField({ control }: Readonly<FieldProps>) {
  const { t } = useTranslation();
  return (
    <Controller
      control={control}
      name="is_active"
      render={({ field }) => (
        <ToggleRow
          testID="food-coupon-active"
          label={t('venueFoodOwner.common.active')}
          hint={t('venueFoodOwner.coupons.activeHint')}
          value={field.value}
          onChange={field.onChange}
        />
      )}
    />
  );
}
