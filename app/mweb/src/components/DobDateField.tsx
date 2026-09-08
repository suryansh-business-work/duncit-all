import { Controller, type Control, type FieldValues, type Path } from 'react-hook-form';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { subYears } from 'date-fns';
import {
  DEFAULT_MIN_ACCOUNT_AGE_YEARS,
  latestEligibleDob,
  parseIsoDay,
  toIsoDay,
} from '@duncit/datetime';
import { useTranslation } from '../i18n/useTranslation';

interface Props<T extends FieldValues> {
  control: Control<T>;
  /** Defaults to the conventional `dob` field both forms declare. */
  name?: Path<T>;
  /** Admin-configured minimum joining age (Admin > Settings). */
  minAge?: number;
  /** Signup asks for it; the profile editor lets it stay blank. */
  required?: boolean;
}

/** Oldest birthday the calendar offers — a floor for the picker, not a rule. */
const OLDEST_YEARS = 120;

/**
 * Full date-of-birth picker — opens on the year so the birth year can be picked
 * fast, then month and day, and the text field stays editable so the date can
 * also be typed. Holds the value as a 'YYYY-MM-DD' string; the calendar stops
 * at the minimum joining age, so an under-age day cannot be picked at all and
 * the validation message is the second line of defence rather than the first.
 *
 * Generic over the form so signup — both doors — and the profile editor share
 * ONE picker: they ask for the same thing and must enforce the same age.
 * RN twin: app/mobile-app/src/forms/account-edit/DobDateField.tsx.
 */
export default function DobDateField<T extends FieldValues>({
  control,
  name,
  minAge = DEFAULT_MIN_ACCOUNT_AGE_YEARS,
  required = false,
}: Readonly<Props<T>>) {
  const { t } = useTranslation();
  const maxDate = latestEligibleDob(minAge);
  const minDate = subYears(maxDate, OLDEST_YEARS);
  return (
    <Controller
      control={control}
      name={name ?? ('dob' as Path<T>)}
      render={({ field, fieldState }) => {
        const stored = typeof field.value === 'string' ? field.value : '';
        return (
          <DatePicker
            label={t('mweb.common.dateOfBirth')}
            openTo="year"
            views={['year', 'month', 'day']}
            value={parseIsoDay(stored)}
            minDate={minDate}
            maxDate={maxDate}
            onChange={(picked) =>
              field.onChange(picked && !Number.isNaN(picked.getTime()) ? toIsoDay(picked) : '')
            }
            slotProps={{
              textField: {
                size: 'small',
                fullWidth: true,
                required,
                onBlur: field.onBlur,
                slotProps: { inputLabel: { shrink: true } },
                error: !!fieldState.error,
                helperText:
                  fieldState.error?.message ??
                  t('mweb.signup.dobHint', { vars: { years: minAge } }),
              },
            }}
          />
        );
      }}
    />
  );
}
