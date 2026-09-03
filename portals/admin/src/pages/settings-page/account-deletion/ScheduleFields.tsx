import {
  Alert,
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  TextField,
} from '@mui/material';
import type { Control, FieldErrors, UseFormRegister } from 'react-hook-form';
import { Controller } from 'react-hook-form';
import { useTranslation } from '@duncit/shell';
import type { DeletionSettingsValues } from './schema';

interface Props {
  register: UseFormRegister<DeletionSettingsValues>;
  control: Control<DeletionSettingsValues>;
  errors: FieldErrors<DeletionSettingsValues>;
  /** Only read when the frequency is WEEKLY, so the day picker hides otherwise. */
  weekly: boolean;
  enabled: boolean;
}

/**
 * Sunday-first, matching every other weekday picker in the consoles and the
 * server's `0 = Sunday`. Labels come from the locale rather than a hardcoded
 * list, so a console in another language reads its own day names.
 */
const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6];

const weekdayLabel = (day: number): string =>
  // 2024-01-07 was a Sunday, so adding the index lands on the right weekday
  // without any assumption about what today is.
  new Date(Date.UTC(2024, 0, 7 + day)).toLocaleDateString(undefined, {
    weekday: 'long',
    timeZone: 'UTC',
  });

/**
 * When the sweep runs, and whether it runs at all.
 *
 * Every field below is disabled while the switch is off — not hidden. An
 * operator turning the job on needs to see the time it will use before they
 * commit to it, and a form that reveals its settings only after you have said
 * yes is asking you to agree to something you cannot read.
 */
export default function ScheduleFields({
  register,
  control,
  errors,
  weekly,
  enabled,
}: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <Stack spacing={2}>
      <Controller
        name="cron_enabled"
        control={control}
        render={({ field }) => (
          <FormControlLabel
            control={
              <Switch
                checked={field.value}
                onChange={(event) => field.onChange(event.target.checked)}
                slotProps={{ input: { 'aria-label': t('admin.accountDeletion.cronEnabled') } }}
                data-testid="deletion-cron-enabled"
              />
            }
            label={t('admin.accountDeletion.cronEnabled')}
          />
        )}
      />
      {enabled && <Alert severity="warning">{t('admin.accountDeletion.cronOnWarning')}</Alert>}

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <TextField
          select
          fullWidth
          size="small"
          disabled={!enabled}
          label={t('admin.accountDeletion.frequency')}
          defaultValue="DAILY"
          slotProps={{ htmlInput: { 'data-testid': 'deletion-cron-frequency' } }}
          {...register('cron_frequency')}
        >
          <MenuItem value="DAILY">{t('admin.accountDeletion.daily')}</MenuItem>
          <MenuItem value="WEEKLY">{t('admin.accountDeletion.weekly')}</MenuItem>
        </TextField>

        <TextField
          fullWidth
          size="small"
          type="time"
          disabled={!enabled}
          label={t('admin.accountDeletion.timeOfDay')}
          error={!!errors.cron_time_of_day}
          helperText={
            errors.cron_time_of_day
              ? t('admin.accountDeletion.timeInvalid')
              : t('admin.accountDeletion.timeHint')
          }
          slotProps={{ inputLabel: { shrink: true } }}
          {...register('cron_time_of_day')}
        />
      </Stack>

      {weekly && (
        <TextField
          select
          fullWidth
          size="small"
          disabled={!enabled}
          label={t('admin.accountDeletion.weekday')}
          sx={{ maxWidth: 260 }}
          defaultValue={0}
          {...register('cron_weekday')}
        >
          {WEEKDAYS.map((day) => (
            <MenuItem key={day} value={day}>
              {weekdayLabel(day)}
            </MenuItem>
          ))}
        </TextField>
      )}

      <TextField
        fullWidth
        size="small"
        type="number"
        disabled={!enabled}
        label={t('admin.accountDeletion.batchSize')}
        sx={{ maxWidth: 260 }}
        error={!!errors.cron_batch_size}
        helperText={
          errors.cron_batch_size
            ? t('admin.accountDeletion.batchRange')
            : t('admin.accountDeletion.batchHint')
        }
        slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: 1, max: 500, step: 1 } }}
        {...register('cron_batch_size')}
      />
    </Stack>
  );
}
