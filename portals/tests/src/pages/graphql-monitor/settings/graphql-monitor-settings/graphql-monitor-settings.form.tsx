import { useEffect, useMemo } from 'react';
import { Controller, useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Box, Divider, FormControlLabel, Stack, Switch, Typography } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import type { MonitorSettings } from '../../queries';
import {
  graphqlMonitorSettingsSchema,
  toSettingsForm,
  type GraphqlMonitorSettingsValues,
} from './graphql-monitor-settings.types';

interface Props {
  settings: MonitorSettings;
  saving: boolean;
  onSubmit: (values: GraphqlMonitorSettingsValues) => void;
}

type NumberField = Exclude<keyof GraphqlMonitorSettingsValues, 'enabled'>;

export default function GraphqlMonitorSettingsForm({ settings, saving, onSubmit }: Readonly<Props>) {
  const { t } = useTranslation();
  const schema = useMemo(
    () =>
      graphqlMonitorSettingsSchema({
        whole: t('tech.graphqlMonitor.vWhole'),
        range: (min, max) => t('tech.graphqlMonitor.vRange', { vars: { min, max } }),
      }),
    [t]
  );
  const { control, handleSubmit, reset } = useForm<GraphqlMonitorSettingsValues, unknown, GraphqlMonitorSettingsValues>({
    resolver: zodResolver(schema) as unknown as Resolver<GraphqlMonitorSettingsValues, unknown, GraphqlMonitorSettingsValues>,
    defaultValues: toSettingsForm(settings),
    mode: 'all',
  });

  useEffect(() => {
    reset(toSettingsForm(settings));
  }, [settings, reset]);

  const numbers: Array<{ name: NumberField; label: string; hint: string }> = [
    { name: 'field_sample_pct', label: t('tech.graphqlMonitor.sSamplePct'), hint: t('tech.graphqlMonitor.sSamplePctHint') },
    { name: 'slow_threshold_ms', label: t('tech.graphqlMonitor.sSlowMs'), hint: t('tech.graphqlMonitor.sSlowMsHint') },
    { name: 'retention_days', label: t('tech.graphqlMonitor.sRetention'), hint: t('tech.graphqlMonitor.sRetentionHint') },
  ];

  return (
    <Stack spacing={2.5} component="form" noValidate onSubmit={handleSubmit(onSubmit)} data-testid="graphql-monitor-settings-form">
      <Controller
        control={control}
        name="enabled"
        render={({ field }) => (
          <FormControlLabel
            control={
              <Switch
                checked={field.value}
                onChange={(_, value) => field.onChange(value)}
                slotProps={{ input: { 'data-testid': 'graphql-monitor-settings-enabled' } as Record<string, string> }}
              />
            }
            label={
              <Box>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {t('tech.graphqlMonitor.sEnabled')}
                </Typography>
                <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                  {t('tech.graphqlMonitor.sEnabledHint')}
                </Typography>
              </Box>
            }
          />
        )}
      />
      <Divider />
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}>
        {numbers.map((field) => (
          <RhfTextField
            key={field.name}
            control={control}
            name={field.name}
            label={field.label}
            hint={field.hint}
            type="number"
            slotProps={{ htmlInput: { inputMode: 'numeric', 'data-testid': `graphql-monitor-settings-${field.name}` } }}
          />
        ))}
      </Box>
      <Box>
        <DuncitButton
          type="submit"
          variant="contained"
          startIcon={<SaveIcon />}
          loading={saving}
          data-testid="graphql-monitor-settings-save"
        >
          {t('shell.common.save')}
        </DuncitButton>
      </Box>
    </Stack>
  );
}
