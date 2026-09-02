import { Controller, type Control } from 'react-hook-form';
import { TextField } from '@mui/material';
import { DEFAULT_MIN_ACCOUNT_AGE_YEARS, latestEligibleBirthYear } from '@duncit/datetime';
import { useTranslation } from '../../i18n/useTranslation';
import type { RegisterFormValues } from './register.types';

interface Props {
  control: Control<RegisterFormValues>;
  /** Admin-configured minimum joining age (Admin > Settings). */
  minAge?: number;
}

/** Oldest year offered — a floor for the list, not a rule. */
const OLDEST_YEARS = 120;

/**
 * The birth-YEAR picker, bound to react-hook-form.
 *
 * A list rather than a calendar, because signup asks for a year — and a NATIVE
 * select rather than MUI's popover one, because 120 options on a phone is
 * exactly what the platform's own wheel is for; MUI's would render 120 divs
 * into a scrolling menu.
 *
 * The list cannot reach an ineligible year, so the age rule is a second line of
 * defence rather than the first thing a new member is told off by. The schema
 * still re-checks it, which is what catches a value that never came from here.
 */
export default function DobYearField({
  control,
  minAge = DEFAULT_MIN_ACCOUNT_AGE_YEARS,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const newest = latestEligibleBirthYear(minAge);
  // Newest first: a new member is far likelier to be 20 than 90, so the year
  // they want is at the top rather than a hundred rows down.
  const years = Array.from({ length: OLDEST_YEARS }, (_, i) => newest - i);

  return (
    <Controller
      control={control}
      name="dobYear"
      render={({ field, fieldState }) => (
        <TextField
          {...field}
          select
          required
          size="small"
          fullWidth
          label={t('mweb.signup.dobYearLabel')}
          error={!!fieldState.error}
          helperText={
            fieldState.error?.message ?? t('mweb.signup.dobYearHint', { vars: { years: minAge } })
          }
          slotProps={{ inputLabel: { shrink: true }, select: { native: true } }}
        >
          {/* The empty option is what lets the label float over a blank box —
              a native select with no value would otherwise show the first year
              as if it had been chosen. */}
          <option value="" />
          {years.map((year) => (
            <option key={year} value={String(year)}>
              {year}
            </option>
          ))}
        </TextField>
      )}
    />
  );
}
