import { Controller, type Control } from 'react-hook-form';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { parseIsoDay, toIsoDay } from '@duncit/datetime';

import type { CouponFormValues } from './coupon';

/**
 * A coupon validity date. Stores 'YYYY-MM-DD' — what the API takes — while the
 * box reads in the admin's configured pattern, inherited from the surface's
 * DuncitLocalizationProvider. It was a `<TextField type="date">`, which shows
 * the BROWSER's date order and so disagreed with every other date on the page.
 */
export default function CouponDateField({
  control,
  name,
  label,
}: Readonly<{
  control: Control<CouponFormValues>;
  name: 'valid_from' | 'valid_until';
  label: string;
}>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <DatePicker
          label={label}
          value={parseIsoDay(field.value ?? '')}
          onChange={(picked) => field.onChange(picked ? toIsoDay(picked) : '')}
          slotProps={{
            textField: {
              size: 'small',
              fullWidth: true,
              onBlur: field.onBlur,
              error: !!fieldState.error,
              helperText: fieldState.error?.message,
            }}}
        />
      )}
    />
  );
}
