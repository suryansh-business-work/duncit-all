import { useId } from 'react';
import { Controller, type Control } from 'react-hook-form';
import { FormControl, FormControlLabel, FormHelperText, Switch, TextField } from '@mui/material';
import { DateTimePicker } from '@mui/x-date-pickers/DateTimePicker';
import { FOOD_ORDER_LIMITS } from '@duncit/utils';
import { useTranslation } from '@duncit/shell';
import type { FoodCouponFormValues } from './food-coupon.types';

interface FieldProps {
  control: Control<FoodCouponFormValues>;
}

/** The code box: whatever is typed or pasted is upper-cased as it lands, the way the server stores it. */
export function FoodCouponCodeField({ control }: Readonly<FieldProps>) {
  const { t } = useTranslation();
  return (
    <Controller
      control={control}
      name="code"
      render={({ field: { ref, ...field }, fieldState }) => (
        <TextField
          {...field}
          inputRef={ref}
          onChange={(event) => field.onChange(event.target.value.toUpperCase())}
          label={t('partners.foodCoupons.code')}
          required
          fullWidth
          error={!!fieldState.error}
          helperText={fieldState.error?.message ?? t('partners.foodCoupons.codeHint')}
          slotProps={{ htmlInput: { maxLength: FOOD_ORDER_LIMITS.couponCodeMax, autoCapitalize: 'characters' } }}
          data-testid="food-coupon-code"
        />
      )}
    />
  );
}

/** The picker's own input, named so a test can type into it. */
const testIdOf = (name: string): { 'data-testid': string } => ({ 'data-testid': `food-coupon-${name}` });

interface DateFieldProps extends FieldProps {
  name: 'valid_from' | 'valid_until';
  label: string;
  hint: string;
  /** The earliest moment the popup offers — the start, for the end's picker. */
  minDateTime?: Date | null;
}

/**
 * One end of the coupon's window. The field shows and reads the admin's
 * configured date and time pattern (the portal's localization provider), and
 * clearing it means "no limit on this side".
 */
export function FoodCouponDateField({ control, name, label, hint, minDateTime }: Readonly<DateFieldProps>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <DateTimePicker
          label={label}
          value={field.value}
          onChange={(date) => field.onChange(date)}
          minDateTime={minDateTime ?? undefined}
          slotProps={{
            field: { clearable: true },
            textField: {
              fullWidth: true,
              onBlur: field.onBlur,
              error: !!fieldState.error,
              helperText: fieldState.error?.message ?? hint,
              slotProps: { htmlInput: testIdOf(name) },
            },
          }}
        />
      )}
    />
  );
}

/** Whether guests can use the code right now — the same switch the table row carries. */
export function FoodCouponActiveField({ control }: Readonly<FieldProps>) {
  const { t } = useTranslation();
  const hintId = useId();
  return (
    <Controller
      control={control}
      name="is_active"
      render={({ field }) => (
        <FormControl>
          <FormControlLabel
            label={t('shell.common.active')}
            control={
              <Switch
                checked={field.value}
                onChange={(_event, checked) => field.onChange(checked)}
                onBlur={field.onBlur}
                slotProps={{ input: { 'aria-describedby': hintId } }}
                data-testid="food-coupon-active"
              />
            }
          />
          <FormHelperText id={hintId} sx={{ mx: 0 }}>
            {t('partners.foodCoupons.activeHint')}
          </FormHelperText>
        </FormControl>
      )}
    />
  );
}
