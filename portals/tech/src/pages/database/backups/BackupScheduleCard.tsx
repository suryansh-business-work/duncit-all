import { useEffect } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  Button,
  Card,
  CardContent,
  Divider,
  FormControlLabel,
  Stack,
  Switch,
  Typography,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import { useTranslation } from '@duncit/shell';
import { formatDateTime } from '../../server/format';
import ScheduleFields from './ScheduleFields';
import { backupSettingsSchema, type BackupSettingsForm } from './schema';
import type { BackupSettings } from './queries';

interface Props {
  settings: BackupSettings;
  saving: boolean;
  error: string | null;
  onSave: (values: BackupSettingsForm) => void;
}

export default function BackupScheduleCard({ settings, saving, error, onSave }: Readonly<Props>) {
  const { t } = useTranslation();
  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty },
  } = useForm<BackupSettingsForm>({
    resolver: zodResolver(backupSettingsSchema),
    defaultValues: settings,
  });

  // The saved values are the form's baseline, so a successful save clears the
  // dirty state instead of leaving Save enabled over nothing.
  useEffect(() => {
    reset({
      enabled: settings.enabled,
      frequency: settings.frequency,
      timeOfDay: settings.timeOfDay,
      weekday: settings.weekday,
      keepLast: settings.keepLast,
    });
  }, [settings, reset]);

  const nextRunText = settings.nextRunAt
    ? formatDateTime(settings.nextRunAt)
    : t('tech.dbBackup.scheduleOff');

  return (
    <Card variant="outlined">
      <CardContent component="form" onSubmit={handleSubmit(onSave)}>
        <Typography variant="subtitle1" fontWeight={700}>
          {t('tech.dbBackup.scheduleTitle')}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          {t('tech.dbBackup.scheduleHint')}
        </Typography>

        <Controller
          name="enabled"
          control={control}
          render={({ field }) => (
            <FormControlLabel
              control={<Switch checked={field.value} onChange={(_e, v) => field.onChange(v)} />}
              label={t('tech.dbBackup.enabled')}
            />
          )}
        />

        <ScheduleFields control={control} errors={errors} weekly={watch('frequency') === 'WEEKLY'} />

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}

        <Divider sx={{ my: 2 }} />

        <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
          <Typography variant="caption" color="text.secondary">
            {t('tech.dbBackup.lastRun')}: {formatDateTime(settings.lastRunAt)}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {t('tech.dbBackup.nextRun')}: {nextRunText}
          </Typography>
          <Button
            type="submit"
            variant="contained"
            startIcon={<SaveIcon />}
            disabled={!isDirty || saving}
            sx={{ ml: 'auto' }}
          >
            {saving ? t('tech.dbBackup.saving') : t('tech.dbBackup.save')}
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}
