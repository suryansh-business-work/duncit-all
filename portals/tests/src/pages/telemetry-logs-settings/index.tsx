import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { Controller, useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  Box,
  Card,
  CardContent,
  Divider,
  FormControlLabel,
  Snackbar,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import { DuncitButton } from '@duncit/buttons';
import { QueryGuard } from '@duncit/ui';
import { TELEMETRY_SETTINGS, UPDATE_TELEMETRY_SETTINGS } from './queries';
import { telemetrySettingsSchema, type TelemetrySettingsForm } from './schema';
import PublicApiKeyCard from './PublicApiKeyCard';
import PersistedLevelsField from './PersistedLevelsField';
import { formatDateTime, useTranslation } from '@duncit/app-settings';

const DEFAULTS: TelemetrySettingsForm = {
  signoz_enabled: true,
  persisted_levels: ['error', 'warn'],
  retention_days: 30,
};

export default function TelemetryLogsSettingsPage() {
  const { t } = useTranslation();
  const { data, loading, error, refetch } = useQuery<any>(TELEMETRY_SETTINGS, {
    fetchPolicy: 'cache-and-network',
  });
  const [save] = useMutation<any>(UPDATE_TELEMETRY_SETTINGS);
  const [toast, setToast] = useState<string | null>(null);
  const [opError, setOpError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<TelemetrySettingsForm, any, TelemetrySettingsForm>({
    resolver: zodResolver(telemetrySettingsSchema) as unknown as Resolver<TelemetrySettingsForm, any, TelemetrySettingsForm>,
    defaultValues: DEFAULTS,
  });

  useEffect(() => {
    if (data?.telemetrySettings) {
      const s = data.telemetrySettings;
      reset({
        signoz_enabled: s.signoz_enabled,
        persisted_levels: s.persisted_levels as TelemetrySettingsForm['persisted_levels'],
        retention_days: s.retention_days,
      });
    }
  }, [data, reset]);

  const onSubmit = async (values: TelemetrySettingsForm) => {
    setOpError(null);
    try {
      await save({ variables: { input: values } });
      setToast(t('tech.telemetryLogsSettings.telemetrySettingsSaved'));
      await refetch();
    } catch (e) {
      setOpError(e instanceof Error ? e.message : t('tech.telemetryLogsSettings.failedToSave'));
    }
  };

  const body = (
    <QueryGuard loading={loading && !data} error={error} errorText={error?.message} spinnerSx={{ py: 4 }}>
      <Stack spacing={2.5} component="form" onSubmit={handleSubmit(onSubmit)}>
        <Controller
          name="signoz_enabled"
          control={control}
          render={({ field }) => (
            <FormControlLabel
              control={<Switch checked={field.value} onChange={(_, v) => field.onChange(v)} />}
              label={
                <Box>
                  <Typography variant="body2" sx={{
                    fontWeight: 600
                  }}>
                    Ship logs to SigNoz (OTLP)
                  </Typography>
                  <Typography variant="caption" sx={{
                    color: "text.secondary"
                  }}>
                    Turn off to stop external export — logs still persist to the database.
                  </Typography>
                </Box>
              }
            />
          )}
        />
        <Divider />
        <PersistedLevelsField
          control={control}
          hasError={!!errors.persisted_levels}
          errorMessage={errors.persisted_levels?.message}
        />
        <Divider />
        <Controller
          name="retention_days"
          control={control}
          render={({ field, fieldState }) => (
            <TextField
              {...field}
              type="number"
              label={t('tech.telemetryLogsSettings.retentionDays')}
              required
              error={!!fieldState.error}
              helperText={
                fieldState.error?.message ?? 'Logs & bugs older than this are deleted daily (max 90).'
              }
              sx={{ maxWidth: 260 }}
              slotProps={{
                htmlInput: { min: 1, max: 90 }
              }}
            />
          )}
        />
        {opError && <Alert severity="error">{opError}</Alert>}
        <Box>
          <DuncitButton
            type="submit"
            variant="contained"
            startIcon={<SaveIcon />}
            loading={isSubmitting} disabled={!isDirty}
          >
            {isSubmitting ? 'Saving…' : 'Save'}
          </DuncitButton>
        </Box>
        {data?.telemetrySettings?.updated_at && (
          <Typography variant="caption" sx={{
            color: "text.secondary"
          }}>
            Last updated {formatDateTime(data.telemetrySettings.updated_at)}
          </Typography>
        )}
      </Stack>
    </QueryGuard>
  );

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h5" component="h1">{t('tech.telemetryLogsSettings.telemetryLogsSettings')}</Typography>
        <Typography variant="body2" sx={{
          color: "text.secondary"
        }}>
          Control which log levels are stored, how long they are kept, and whether logs ship to
          SigNoz.
        </Typography>
      </Box>
      <Card>
        <CardContent>{body}</CardContent>
      </Card>
      <PublicApiKeyCard />
      <Snackbar
        open={!!toast}
        autoHideDuration={3000}
        onClose={() => setToast(null)}
        message={toast ?? ''}
      />
    </Stack>
  );
}
