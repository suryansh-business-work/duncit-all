import { useEffect, useMemo } from 'react';
import { useForm, type Control, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Box, Divider, Stack, Typography } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import type { StressSettings } from '../queries';
import { stressSettingsSchema, toSettingsForm, type StressSettingsValues } from './stress-settings.types';

interface Props {
  settings: StressSettings;
  saving: boolean;
  onSubmit: (values: StressSettingsValues) => void;
}

interface FieldSpec {
  name: keyof StressSettingsValues;
  label: string;
  hint: string;
}

function FieldGrid({ control, fields }: Readonly<{ control: Control<StressSettingsValues>; fields: FieldSpec[] }>) {
  return (
    <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
      {fields.map((field) => (
        <RhfTextField
          key={field.name}
          control={control}
          name={field.name}
          label={field.label}
          hint={field.hint}
          type="number"
          slotProps={{ htmlInput: { inputMode: 'numeric' } }}
        />
      ))}
    </Box>
  );
}

export default function StressSettingsForm({ settings, saving, onSubmit }: Readonly<Props>) {
  const { t } = useTranslation();
  const schema = useMemo(
    () =>
      stressSettingsSchema({
        whole: t('tech.stress.vWhole'),
        range: (min, max) => t('tech.stress.vRange', { vars: { min, max } }),
      }),
    [t]
  );
  const { control, handleSubmit, reset } = useForm<StressSettingsValues, unknown, StressSettingsValues>({
    resolver: zodResolver(schema) as unknown as Resolver<StressSettingsValues, unknown, StressSettingsValues>,
    defaultValues: toSettingsForm(settings),
    mode: 'all',
  });

  useEffect(() => {
    reset(toSettingsForm(settings));
  }, [settings, reset]);

  const ceilings: FieldSpec[] = [
    { name: 'max_virtual_users', label: t('tech.stress.sMaxUsers'), hint: t('tech.stress.sMaxUsersHint') },
    { name: 'max_browser_bots', label: t('tech.stress.sMaxBots'), hint: t('tech.stress.sMaxBotsHint') },
    { name: 'max_runners', label: t('tech.stress.sMaxRunners'), hint: t('tech.stress.sMaxRunnersHint') },
    { name: 'max_duration_minutes', label: t('tech.stress.sMaxDuration'), hint: t('tech.stress.sMaxDurationHint') },
  ];
  const guardrails: FieldSpec[] = [
    { name: 'abort_error_rate_pct', label: t('tech.stress.sAbortErrorRate'), hint: t('tech.stress.sAbortErrorRateHint') },
    { name: 'abort_p95_ms', label: t('tech.stress.sAbortP95'), hint: t('tech.stress.sAbortP95Hint') },
    { name: 'abort_host_cpu_pct', label: t('tech.stress.sAbortCpu'), hint: t('tech.stress.sAbortCpuHint') },
    { name: 'abort_breach_samples', label: t('tech.stress.sBreachSamples'), hint: t('tech.stress.sBreachSamplesHint') },
  ];
  const retention: FieldSpec[] = [
    { name: 'sample_retention_days', label: t('tech.stress.sRetention'), hint: t('tech.stress.sRetentionHint') },
  ];

  return (
    <Stack spacing={2.5} component="form" noValidate onSubmit={handleSubmit(onSubmit)}>
      <Typography variant="subtitle2">{t('tech.stress.sCeilings')}</Typography>
      <FieldGrid control={control} fields={ceilings} />
      <Divider />
      <Typography variant="subtitle2">{t('tech.stress.sGuardrails')}</Typography>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {t('tech.stress.sGuardrailsHint')}
      </Typography>
      <FieldGrid control={control} fields={guardrails} />
      <Divider />
      <FieldGrid control={control} fields={retention} />
      <Box>
        <DuncitButton type="submit" variant="contained" startIcon={<SaveIcon />} loading={saving}>
          {t('shell.common.save')}
        </DuncitButton>
      </Box>
    </Stack>
  );
}
