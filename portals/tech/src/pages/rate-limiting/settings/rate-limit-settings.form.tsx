import { useEffect, useMemo } from 'react';
import { Controller, useForm, type Control , type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Box, Divider, FormControlLabel, Stack, Switch, Typography } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/app-settings';
import { EnumSelect } from '../rules/rate-limit-rule';
import type { RateLimitOptionsData } from '../queries';
import {
  rateLimitSettingsSchema,
  toSettingsForm,
  toSettingsInput,
  type RateLimitSettingsData,
  type RateLimitSettingsForm as Values,
} from './rate-limit-settings.types';

interface Props {
  settings: RateLimitSettingsData;
  options: RateLimitOptionsData;
  saving: boolean;
  opError: string | null;
  onSubmit: (input: Record<string, unknown>) => void;
}

interface ToggleProps {
  control: Control<Values>;
  name: 'enabled' | 'monitor_only' | 'send_headers' | 'log_blocks' | 'notify_slack';
  label: string;
  hint: string;
}

/** A switch with the sentence that says what turning it off actually does. */
function SettingToggle({ control, name, label, hint }: Readonly<ToggleProps>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <FormControlLabel
          control={
            <Switch checked={Boolean(field.value)} onChange={(_, v) => field.onChange(v)} />
          }
          label={
            <Box>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                {label}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                {hint}
              </Typography>
            </Box>
          }
        />
      )}
    />
  );
}

export default function RateLimitSettingsForm({
  settings,
  options,
  saving,
  opError,
  onSubmit,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const schema = useMemo(
    () =>
      rateLimitSettingsSchema({
        retentionRange: t('tech.rateLimit.validation.retentionRange'),
        messageRequired: t('tech.rateLimit.validation.messageRequired'),
      }),
    [t],
  );
  const { control, handleSubmit, reset } = useForm<Values, any, Values>({
    resolver: zodResolver(schema) as unknown as Resolver<Values, any, Values>,
    defaultValues: toSettingsForm(settings),
  });

  useEffect(() => {
    reset(toSettingsForm(settings));
  }, [settings, reset]);

  return (
    <Stack
      spacing={2.5}
      component="form"
      onSubmit={handleSubmit((values) => onSubmit(toSettingsInput(values)))}
    >
      <SettingToggle
        control={control}
        name="enabled"
        label={t('tech.rateLimit.settings.masterSwitch')}
        hint={t('tech.rateLimit.settings.masterSwitchHint')}
      />
      <SettingToggle
        control={control}
        name="monitor_only"
        label={t('tech.rateLimit.settings.monitorOnly')}
        hint={t('tech.rateLimit.settings.monitorOnlyHint')}
      />
      <Divider />
      <SettingToggle
        control={control}
        name="send_headers"
        label={t('tech.rateLimit.settings.sendHeaders')}
        hint={t('tech.rateLimit.settings.sendHeadersHint')}
      />
      <SettingToggle
        control={control}
        name="log_blocks"
        label={t('tech.rateLimit.settings.logBlocks')}
        hint={t('tech.rateLimit.settings.logBlocksHint')}
      />
      <SettingToggle
        control={control}
        name="notify_slack"
        label={t('tech.rateLimit.settings.notifySlack')}
        hint={t('tech.rateLimit.settings.notifySlackHint')}
      />
      <Divider />
      <RhfTextField
        control={control}
        name="default_message"
        label={t('tech.rateLimit.settings.defaultMessage')}
        hint={t('tech.rateLimit.settings.defaultMessageHint')}
        multiline
        minRows={2}
      />
      <Box
        sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' } }}
      >
        <EnumSelect
          control={control}
          name="exempt_roles"
          label={t('tech.rateLimit.settings.exemptRoles')}
          hint={t('tech.rateLimit.settings.exemptRolesHint')}
          options={options.roles.map((role) => ({ value: role.key, label: role.name }))}
          multiple
        />
        <RhfTextField
          control={control}
          name="event_retention_days"
          type="number"
          label={t('tech.rateLimit.settings.retentionDays')}
          hint={t('tech.rateLimit.settings.retentionDaysHint')}
          slotProps={{ htmlInput: { min: 1, max: 90 } }}
        />
        <RhfTextField
          control={control}
          name="allow_ips"
          label={t('tech.rateLimit.settings.allowIps')}
          hint={t('tech.rateLimit.settings.allowIpsHint')}
        />
        <RhfTextField
          control={control}
          name="block_ips"
          label={t('tech.rateLimit.settings.blockIps')}
          hint={t('tech.rateLimit.settings.blockIpsHint')}
        />
      </Box>
      {opError && <Alert severity="error">{opError}</Alert>}
      <DuncitButton
        type="submit"
        variant="contained"
        startIcon={<SaveIcon />}
        disabled={saving}
        sx={{ alignSelf: 'flex-start' }}
      >
        {t('shell.common.save')}
      </DuncitButton>
    </Stack>
  );
}
