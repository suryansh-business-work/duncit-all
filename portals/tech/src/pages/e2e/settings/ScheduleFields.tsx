import { Controller, type Control, type FieldErrors } from 'react-hook-form';
import { FormControlLabel, MenuItem, Stack, Switch, TextField } from '@mui/material';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { useTranslation } from '@duncit/shell';
import { dateToTime, timeToDate } from '../../../lib/time-of-day';
import type { E2eSettingsValues } from './e2e-settings.types';

interface Props {
  control: Control<E2eSettingsValues>;
  errors: FieldErrors<E2eSettingsValues>;
  weekly: boolean;
}

/**
 * When the nightly sweep runs, on which branch, and how much history to keep.
 *
 * The time is wall-clock in the platform's own timezone, not this browser's —
 * an operator picking 03:00 means the quiet hour their users are asleep
 * through, wherever they happen to be sitting.
 */
export default function ScheduleFields({ control, errors, weekly }: Readonly<Props>) {
  const { t } = useTranslation();

  // Written out rather than generated from an index: rule 38's gate reads
  // literal t('…') calls, and a composed key is a key it cannot see. These are
  // the day names the backup schedule already ships.
  const weekdayOptions = [
    { value: 0, label: t('tech.dbBackup.sunday') },
    { value: 1, label: t('tech.dbBackup.monday') },
    { value: 2, label: t('tech.dbBackup.tuesday') },
    { value: 3, label: t('tech.dbBackup.wednesday') },
    { value: 4, label: t('tech.dbBackup.thursday') },
    { value: 5, label: t('tech.dbBackup.friday') },
    { value: 6, label: t('tech.dbBackup.saturday') },
  ];

  return (
    <Stack spacing={2}>
      <Controller
        name="enabled"
        control={control}
        render={({ field }) => (
          <FormControlLabel
            control={<Switch checked={field.value} onChange={(e) => field.onChange(e.target.checked)} />}
            label={t('tech.e2e.scheduleEnabled')}
          />
        )}
      />

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        <Controller
          name="frequency"
          control={control}
          render={({ field }) => (
            <TextField {...field} select label={t('tech.e2e.frequency')} sx={{ minWidth: 180 }}>
              <MenuItem value="DAILY">{t('tech.e2e.frequencyDaily')}</MenuItem>
              <MenuItem value="WEEKLY">{t('tech.e2e.frequencyWeekly')}</MenuItem>
            </TextField>
          )}
        />

        {weekly && (
          <Controller
            name="weekday"
            control={control}
            render={({ field }) => (
              <TextField {...field} select label={t('tech.e2e.weekday')} sx={{ minWidth: 180 }}>
                {weekdayOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />
        )}

        <Controller
          name="time_of_day"
          control={control}
          render={({ field }) => (
            <TimePicker
              label={t('tech.e2e.runAt')}
              value={timeToDate(field.value)}
              onChange={(value) => field.onChange(dateToTime(value))}
              slotProps={{
                textField: {
                  sx: { minWidth: 160 },
                  error: Boolean(errors.time_of_day),
                  helperText: errors.time_of_day?.message ?? t('tech.e2e.runAtHint'),
                },
              }}
            />
          )}
        />
      </Stack>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
        <Controller
          name="ref"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label={t('tech.e2e.scheduleRef')}
              error={Boolean(errors.ref)}
              helperText={errors.ref?.message ?? t('tech.e2e.scheduleRefHint')}
              sx={{ minWidth: 220 }}
            />
          )}
        />
        <Controller
          name="keep_last"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              type="number"
              onChange={(event) => field.onChange(Number(event.target.value))}
              label={t('tech.e2e.keepLast')}
              error={Boolean(errors.keep_last)}
              helperText={errors.keep_last?.message ?? t('tech.e2e.keepLastHint')}
              sx={{ minWidth: 200 }}
            />
          )}
        />
      </Stack>
    </Stack>
  );
}
