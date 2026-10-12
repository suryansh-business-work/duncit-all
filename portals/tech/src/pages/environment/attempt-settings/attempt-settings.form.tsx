import { useEffect, useMemo } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Box, Stack, Typography } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/app-settings';
import type { EnvAttemptSettings } from '../queries';
import {
  ATTEMPT_BOUNDS,
  attemptSettingsSchema,
  toAttemptSettingsForm,
  type AttemptSettingsValues,
} from './attempt-settings.types';

interface Props {
  settings: EnvAttemptSettings;
  saving: boolean;
  onSubmit: (values: AttemptSettingsValues) => void;
}

/** The window, then one cap per environment category — 0 leaves a category unlimited. */
export default function AttemptSettingsForm({ settings, saving, onSubmit }: Readonly<Props>) {
  const { t } = useTranslation();
  const schema = useMemo(
    () =>
      attemptSettingsSchema({
        whole: t('tech.environment.attemptsWhole'),
        range: (min, max) => t('tech.environment.attemptsRange', { vars: { min, max } }),
      }),
    [t]
  );
  const { control, handleSubmit, reset } = useForm<AttemptSettingsValues, unknown, AttemptSettingsValues>({
    resolver: zodResolver(schema) as unknown as Resolver<AttemptSettingsValues, unknown, AttemptSettingsValues>,
    defaultValues: toAttemptSettingsForm(settings),
    mode: 'all',
  });

  // A save (or a first load) re-arms the form with what is now stored.
  useEffect(() => reset(toAttemptSettingsForm(settings)), [settings, reset]);

  const { max_attempts: cap, window_hours: hours } = ATTEMPT_BOUNDS;

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} data-testid="env-attempt-settings-form">
      <Stack spacing={2.5}>
        <RhfTextField
          control={control}
          name="window_hours"
          type="number"
          required
          label={t('tech.environment.attemptsWindow')}
          hint={t('tech.environment.attemptsWindowHint')}
          slotProps={{ htmlInput: { min: hours.min, max: hours.max, inputMode: 'numeric' } }}
          sx={{ maxWidth: 320 }}
          data-testid="env-attempt-window"
        />
        <Typography variant="subtitle2" component="h3">
          {t('tech.environment.attemptsPerCategory')}
        </Typography>
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' } }}>
          {settings.limits.map((limit) => (
            <RhfTextField
              key={limit.category}
              control={control}
              name={`limits.${limit.category}`}
              type="number"
              label={limit.label}
              hint={t('tech.environment.attemptsCapHint')}
              slotProps={{ htmlInput: { min: cap.min, max: cap.max, inputMode: 'numeric' } }}
              data-testid={`env-attempt-limit-${limit.category}`}
            />
          ))}
        </Box>
        <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
          <DuncitButton type="submit" variant="contained" startIcon={<SaveIcon />} loading={saving}>
            {t('shell.common.save')}
          </DuncitButton>
        </Stack>
      </Stack>
    </form>
  );
}
