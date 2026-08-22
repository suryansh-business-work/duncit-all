import { Controller, type Control, type FieldErrors } from 'react-hook-form';
import { MenuItem, Stack, TextField } from '@mui/material';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import { useTranslation } from '@duncit/shell';
import type { BackupSettingsForm } from './schema';

interface Props {
  control: Control<BackupSettingsForm>;
  errors: FieldErrors<BackupSettingsForm>;
  weekly: boolean;
}

/** `HH:mm` onto a Date the picker can hold, and back again. */
const timeToDate = (value: string): Date => {
  const [h, m] = (value || '03:00').split(':').map(Number);
  const date = new Date();
  date.setHours(h || 0, m || 0, 0, 0);
  return date;
};

const dateToTime = (date: Date | null): string => {
  if (!date || Number.isNaN(date.getTime())) return '03:00';
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

/** The four inputs that make up a schedule. Split out of BackupScheduleCard to
 * keep that file inside the 200-line limit; it owns the card and the footer. */
export default function ScheduleFields({ control, errors, weekly }: Readonly<Props>) {
  const { t } = useTranslation();

  // Written out rather than generated from an index: rule 38's gate reads
  // literal t('…') calls, and a composed key is a key it cannot see.
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
    <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mt: 2 }}>
      <Controller
        name="frequency"
        control={control}
        render={({ field }) => (
          <TextField {...field} select label={t('tech.dbBackup.frequency')} sx={{ minWidth: 180 }}>
            <MenuItem value="DAILY">{t('tech.dbBackup.frequencyDaily')}</MenuItem>
            <MenuItem value="WEEKLY">{t('tech.dbBackup.frequencyWeekly')}</MenuItem>
          </TextField>
        )}
      />

      {weekly && (
        <Controller
          name="weekday"
          control={control}
          render={({ field }) => (
            <TextField {...field} select label={t('tech.dbBackup.weekday')} sx={{ minWidth: 180 }}>
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
        name="timeOfDay"
        control={control}
        render={({ field }) => (
          <TimePicker
            label={t('tech.dbBackup.runAt')}
            value={timeToDate(field.value)}
            onChange={(value) => field.onChange(dateToTime(value))}
            slotProps={{
              textField: {
                sx: { minWidth: 160 },
                error: !!errors.timeOfDay,
                helperText: errors.timeOfDay?.message,
              },
            }}
          />
        )}
      />

      <Controller
        name="keepLast"
        control={control}
        render={({ field }) => (
          <TextField
            {...field}
            type="number"
            label={t('tech.dbBackup.keepLast')}
            error={!!errors.keepLast}
            helperText={errors.keepLast?.message ?? t('tech.dbBackup.keepLastHint')}
            sx={{ minWidth: 200 }}
          />
        )}
      />
    </Stack>
  );
}
