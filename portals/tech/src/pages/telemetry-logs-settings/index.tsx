import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Divider,
  FormControlLabel,
  FormGroup,
  FormHelperText,
  Snackbar,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import { QueryGuard } from '@duncit/ui';
import { LEVELS, TELEMETRY_SETTINGS, UPDATE_TELEMETRY_SETTINGS } from './queries';
import { telemetrySettingsSchema, type TelemetrySettingsForm } from './schema';

const DEFAULTS: TelemetrySettingsForm = {
  signoz_enabled: true,
  persisted_levels: ['error', 'warn'],
  retention_days: 30,
};

export default function TelemetryLogsSettingsPage() {
  const { data, loading, error, refetch } = useQuery(TELEMETRY_SETTINGS, {
    fetchPolicy: 'cache-and-network',
  });
  const [save] = useMutation(UPDATE_TELEMETRY_SETTINGS);
  const [toast, setToast] = useState<string | null>(null);
  const [opError, setOpError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty, isSubmitting },
  } = useForm<TelemetrySettingsForm>({
    resolver: zodResolver(telemetrySettingsSchema),
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
      setToast('Telemetry settings saved');
      await refetch();
    } catch (e) {
      setOpError(e instanceof Error ? e.message : 'Failed to save');
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
                  <Typography variant="body2" fontWeight={600}>
                    Ship logs to SigNoz (OTLP)
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Turn off to stop external export — logs still persist to the database.
                  </Typography>
                </Box>
              }
            />
          )}
        />
        <Divider />
        <Box>
          <Typography variant="body2" fontWeight={600} gutterBottom>
            Levels persisted to the database
          </Typography>
          <Controller
            name="persisted_levels"
            control={control}
            render={({ field }) => (
              <FormGroup row>
                {LEVELS.map((lvl) => (
                  <FormControlLabel
                    key={lvl}
                    control={
                      <Checkbox
                        checked={field.value.includes(lvl)}
                        onChange={(e) =>
                          field.onChange(
                            e.target.checked
                              ? [...field.value, lvl]
                              : field.value.filter((l) => l !== lvl),
                          )
                        }
                      />
                    }
                    label={lvl}
                  />
                ))}
              </FormGroup>
            )}
          />
          {errors.persisted_levels && (
            <FormHelperText error>{errors.persisted_levels.message}</FormHelperText>
          )}
        </Box>
        <Divider />
        <Controller
          name="retention_days"
          control={control}
          render={({ field, fieldState }) => (
            <TextField
              {...field}
              type="number"
              label="Retention (days)"
              required
              error={!!fieldState.error}
              helperText={
                fieldState.error?.message ?? 'Logs & bugs older than this are deleted daily (max 90).'
              }
              inputProps={{ min: 1, max: 90 }}
              sx={{ maxWidth: 260 }}
            />
          )}
        />
        {opError && <Alert severity="error">{opError}</Alert>}
        <Box>
          <Button
            type="submit"
            variant="contained"
            startIcon={<SaveIcon />}
            disabled={isSubmitting || !isDirty}
          >
            {isSubmitting ? 'Saving…' : 'Save'}
          </Button>
        </Box>
        {data?.telemetrySettings?.updated_at && (
          <Typography variant="caption" color="text.secondary">
            Last updated {new Date(data.telemetrySettings.updated_at).toLocaleString()}
          </Typography>
        )}
      </Stack>
    </QueryGuard>
  );

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h5">Telemetry Logs Settings</Typography>
        <Typography variant="body2" color="text.secondary">
          Control which log levels are stored, how long they are kept, and whether logs ship to
          SigNoz.
        </Typography>
      </Box>
      <Card>
        <CardContent>{body}</CardContent>
      </Card>
      <Snackbar
        open={!!toast}
        autoHideDuration={3000}
        onClose={() => setToast(null)}
        message={toast ?? ''}
      />
    </Stack>
  );
}
