import { Controller, type Control } from 'react-hook-form';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { parseISO } from 'date-fns';
import { DEFAULT_MIN_ACCOUNT_AGE_YEARS, latestEligibleDob } from '@duncit/datetime';
import { useTranslation } from '../../i18n/useTranslation';
import type { RegisterFormValues } from './register.types';

interface Props {
  control: Control<RegisterFormValues>;
  /** Admin-configured minimum joining age (Admin > Settings). */
  minAge?: number;
}

/** Oldest selectable birth date — a floor for the calendar, not a rule. */
const OLDEST_YEARS = 120;

const pad = (value: number) => String(value).padStart(2, '0');
/** Local calendar day as YYYY-MM-DD — `toISOString` would shift the day for any
 * timezone behind UTC and could store a date one day off. */
const toIsoDay = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

/** MUIX date-of-birth picker bound to react-hook-form, storing 'YYYY-MM-DD'.
 * The calendar cannot reach a date younger than the minimum joining age, so an
 * ineligible birthday cannot be picked; the schema still re-checks it, which is
 * what catches a typed date.
 *
 * What the box READS as is the admin's configured date pattern, inherited from
 * the root DuncitLocalizationProvider — the stored value stays ISO either way.
 * This field used to wrap its own LocalizationProvider, which shadowed the root
 * one and put the adapter's en-US MM/DD/YYYY back on the very first thing a new
 * member types. */
export default function DobYearField({
  control,
  minAge = DEFAULT_MIN_ACCOUNT_AGE_YEARS,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const maxDate = latestEligibleDob(minAge);
  const minDate = new Date(maxDate.getFullYear() - OLDEST_YEARS, 0, 1);
  const hint = t('mweb.signup.dobHint', { vars: { years: minAge } });
  return (
    <Controller
      control={control}
      name="dob"
      render={({ field, fieldState }) => (
        <DatePicker
          label={t('mweb.auth.dateOfBirth')}
          openTo="year"
          views={['year', 'month', 'day']}
          value={field.value ? parseISO(field.value) : null}
          minDate={minDate}
          maxDate={maxDate}
          onChange={(d) => {
            const isReal = d && !Number.isNaN(d.getTime());
            field.onChange(isReal ? toIsoDay(d) : '');
            /* Typing a birthday never blurs the field, so under the form's
               `onTouched` mode the age rule stayed silent until focus moved
               on — while picking one flagged straight away, because opening
               the calendar blurs the input first. The field publishes only
               complete dates, so marking it touched here checks a typed date
               the same moment a picked one is checked. */
            field.onBlur();
          }}
          slotProps={{
            textField: {
              required: true,
              size: 'small',
              fullWidth: true,
              onBlur: field.onBlur,
              slotProps: { inputLabel: { shrink: true } },
              error: !!fieldState.error,
              helperText: fieldState.error?.message ?? hint,
            }}}
        />
      )}
    />
  );
}
