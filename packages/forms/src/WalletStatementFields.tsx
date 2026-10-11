import type { ComponentType } from 'react';
import { Controller, type Control, type FieldErrors } from 'react-hook-form';
import { Box, MenuItem, Stack, TextField, Typography } from '@mui/material';
import {
  STATEMENT_FORMATS,
  STATEMENT_PRESETS,
  STATEMENT_PRESET_LABEL_KEYS,
  statementPresetRange,
  zonedToday,
  type StatementPreset,
} from '@duncit/utils';
import type { Translate } from './schemas/translate';
import type { WalletStatementValues } from './schemas/wallet-statement';

/** The surface's clock: its "now" and the business time zone (`useDateFormat()` satisfies it). */
export interface WalletStatementClock {
  now: () => Date;
  timeZone: string;
}

/** The clock, plus the admin's format for a stored `yyyy-MM-dd` day. */
export interface WalletStatementDateFormat extends WalletStatementClock {
  formatDay: (value: string) => string;
}

/** What the surface's own date picker is handed for a custom day. It emits `yyyy-MM-dd`. */
export interface WalletStatementDateFieldProps {
  label: string;
  value: string;
  onChange: (iso: string) => void;
  onBlur: () => void;
  maxDate: Date;
  required: boolean;
  disabled: boolean;
  error: boolean;
  helperText?: string;
}

/** What the statement dialog hands whichever fields component it is given. */
export interface WalletStatementFormFieldsProps {
  control: Control<WalletStatementValues>;
  errors: FieldErrors<WalletStatementValues>;
  preset: StatementPreset;
  disabled: boolean;
}

export interface WalletStatementFieldsProps extends WalletStatementFormFieldsProps {
  /** The surface's translator — the copy is `withdraw.statement.*`. */
  t: Translate;
  dateFormat: WalletStatementDateFormat;
  /** The surface's standard date picker (its `DateField`), so the package ships no picker of its own. */
  DateField: ComponentType<WalletStatementDateFieldProps>;
  /** Put the two custom days side by side from `sm` up. Stacked when off. */
  datesInline?: boolean;
}

const CUSTOM_DAYS = [
  { name: 'from', label: 'withdraw.statement.fromLabel', testId: 'statement-from' },
  { name: 'to', label: 'withdraw.statement.toLabel', testId: 'statement-to' },
] as const;

/**
 * The statement form's three questions: which period, (for a custom one) which
 * days, and which file format. A preset shows the days it covers today, in the
 * admin's date format and the business time zone. One copy for mWeb and the
 * partner console; the native app asks the same three from the same presets.
 */
export default function WalletStatementFields({
  control,
  errors,
  preset,
  disabled,
  t,
  dateFormat,
  DateField,
  datesInline,
}: Readonly<WalletStatementFieldsProps>) {
  const now = dateFormat.now();
  const range = statementPresetRange(preset, now, dateFormat.timeZone);
  // The last pickable day is today in the business zone, as a local calendar date.
  const today = new Date(`${zonedToday(now, dateFormat.timeZone)}T00:00:00`);

  return (
    <Stack spacing={2}>
      <Controller
        control={control}
        name="preset"
        render={({ field }) => (
          <TextField
            select
            label={t('withdraw.statement.periodLabel')}
            disabled={disabled}
            data-testid="statement-preset"
            {...field}
          >
            {STATEMENT_PRESETS.map((option) => (
              <MenuItem key={option} value={option} data-testid={`statement-preset-${option}`}>
                {t(STATEMENT_PRESET_LABEL_KEYS[option])}
              </MenuItem>
            ))}
          </TextField>
        )}
      />
      {range ? (
        <Typography variant="body2" sx={{ color: 'text.secondary' }} data-testid="statement-range">
          {t('withdraw.statement.rangeSummary', {
            vars: { from: dateFormat.formatDay(range.from), to: dateFormat.formatDay(range.to) },
          })}
        </Typography>
      ) : (
        <Stack
          direction={datesInline ? { xs: 'column', sm: 'row' } : 'column'}
          spacing={2}
          data-testid="statement-custom-days"
        >
          {CUSTOM_DAYS.map((day) => (
            <Box key={day.name} data-testid={day.testId} sx={{ flex: 1, minWidth: 0 }}>
              <Controller
                control={control}
                name={day.name}
                render={({ field }) => (
                  <DateField
                    label={t(day.label)}
                    value={field.value}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    maxDate={today}
                    required
                    disabled={disabled}
                    error={!!errors[day.name]}
                    helperText={errors[day.name]?.message}
                  />
                )}
              />
            </Box>
          ))}
        </Stack>
      )}
      <Controller
        control={control}
        name="format"
        render={({ field }) => (
          <TextField
            select
            label={t('withdraw.statement.formatLabel')}
            disabled={disabled}
            data-testid="statement-format"
            {...field}
          >
            {STATEMENT_FORMATS.map((option) => (
              <MenuItem key={option} value={option} data-testid={`statement-format-${option}`}>
                {option}
              </MenuItem>
            ))}
          </TextField>
        )}
      />
    </Stack>
  );
}
