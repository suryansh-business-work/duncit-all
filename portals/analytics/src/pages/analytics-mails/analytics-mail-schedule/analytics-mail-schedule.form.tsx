import { useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Box, FormControlLabel, MenuItem, Stack, Switch, TextField } from '@mui/material';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { dateToTimeOfDay, timeOfDayToDate, useTranslation } from '@duncit/app-settings';
import { DuncitButton } from '@duncit/buttons';
import type { AnalyticsMailSettings } from '../queries';
import { weekdayOptions } from '../weekdays';
import {
  DEFAULT_SEND_TIME,
  scheduleSchema,
  toScheduleValues,
  type ScheduleValues,
} from './analytics-mail-schedule.types';

interface Props {
  settings: AnalyticsMailSettings;
  busy: boolean;
  onSubmit: (values: ScheduleValues) => void;
}

/**
 * When every subscriber's report goes out: the switch, the time of day and —
 * for weekly subscribers — the day. The time is the platform's wall-clock
 * (Admin > Settings), whatever zone this browser is in.
 */
export default function AnalyticsMailScheduleForm({ settings, busy, onSubmit }: Readonly<Props>) {
  const { t, locale } = useTranslation();
  const weekdays = useMemo(() => weekdayOptions(locale), [locale]);
  const { control, handleSubmit, formState } = useForm<ScheduleValues>({
    defaultValues: toScheduleValues(settings),
    resolver: zodResolver(scheduleSchema({ timeFormat: t('analytics.mails.timeFormat') })),
    mode: 'all',
  });
  const timeError = formState.errors.time_of_day?.message;

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate data-testid="analytics-mail-schedule-form">
      <Stack spacing={2}>
        <Controller
          name="enabled"
          control={control}
          render={({ field }) => (
            <FormControlLabel
              control={
                <Switch
                  checked={field.value}
                  onChange={(event) => field.onChange(event.target.checked)}
                  data-testid="analytics-mail-enabled"
                />
              }
              label={t('analytics.mails.enabled')}
            />
          )}
        />
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <Controller
            name="time_of_day"
            control={control}
            render={({ field }) => (
              <TimePicker
                label={t('analytics.mails.sendAt')}
                value={timeOfDayToDate(field.value, DEFAULT_SEND_TIME)}
                onChange={(value) => field.onChange(dateToTimeOfDay(value, DEFAULT_SEND_TIME))}
                slotProps={{
                  textField: {
                    sx: { minWidth: 200 },
                    error: Boolean(timeError),
                    helperText: timeError ?? t('analytics.mails.sendAtHint', { vars: { zone: settings.time_zone } }),
                  },
                }}
              />
            )}
          />
          <Controller
            name="weekday"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                select
                label={t('analytics.mails.weeklyOn')}
                helperText={t('analytics.mails.weeklyOnHint')}
                sx={{ minWidth: 200 }}
                slotProps={{ htmlInput: { 'data-testid': 'analytics-mail-weekday' } }}
              >
                {weekdays.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
            )}
          />
        </Stack>
        <Box>
          <DuncitButton type="submit" variant="contained" loading={busy} data-testid="analytics-mail-schedule-save">
            {t('analytics.mails.saveSchedule')}
          </DuncitButton>
        </Box>
      </Stack>
    </form>
  );
}
