import { Controller, type Control } from 'react-hook-form';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { format, parseISO, subYears } from 'date-fns';
import { DEFAULT_MIN_ACCOUNT_AGE_YEARS, latestEligibleDob } from '@duncit/datetime';
import type { AccountEditValues } from './account-edit.types';
import { useTranslation } from '../../../i18n/useTranslation';

/**
 * Full date-of-birth picker (bug 1) — opens on the year so the birth year can be
 * picked fast, then month and day, and the text field stays editable so the year
 * can also be typed. Stores the value as a 'YYYY-MM-DD' string; the calendar
 * stops at the minimum joining age (so an under-18 day cannot be picked at all)
 * and the range is capped at 120 years.
 */
export default function DobDateField({
  control,
  minAge = DEFAULT_MIN_ACCOUNT_AGE_YEARS,
}: Readonly<{ control: Control<AccountEditValues>; minAge?: number }>) {
  const { t } = useTranslation();
  const maxDate = latestEligibleDob(minAge);
  const minDate = subYears(maxDate, 120);
  return (
    <Controller
      control={control}
      name="dob"
      render={({ field, fieldState }) => (
        <DatePicker
          label={t('mweb.common.dateOfBirth')}
          openTo="year"
          views={['year', 'month', 'day']}
          value={field.value ? parseISO(field.value) : null}
          minDate={minDate}
          maxDate={maxDate}
          onChange={(d) =>
            field.onChange(d && !Number.isNaN(d.getTime()) ? format(d, 'yyyy-MM-dd') : '')
          }
          slotProps={{
            textField: {
              size: 'small',
              fullWidth: true,
              onBlur: field.onBlur,
              slotProps: { inputLabel: { shrink: true } },
              error: !!fieldState.error,
              helperText:
                fieldState.error?.message ?? `Must be at least ${minAge} years old`,
            }}}
        />
      )}
    />
  );
}
