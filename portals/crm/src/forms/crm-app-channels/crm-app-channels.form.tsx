import { useEffect, useMemo } from 'react';
import { Controller, useForm, type Control } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, MenuItem, Stack, TextField } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import { crmAppChannelsSchema } from './crm-app-channels.schema';
import type { CrmAppChannelsFormProps, CrmAppChannelsValues, Translate } from './crm-app-channels.types';
import type { CrmSlackChannel } from '../../api/appDownload.gql';

interface FieldProps {
  control: Control<CrmAppChannelsValues>;
  name: keyof CrmAppChannelsValues;
  label: string;
  hint: string;
  channels: CrmSlackChannel[];
  t: Translate;
}

/** One channel picker, warning when the bot is not in the picked channel (it could not post). */
function ChannelField({ control, name, label, hint, channels, t }: Readonly<FieldProps>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const picked = channels.find((c) => c.id === field.value);
        return (
          <Stack spacing={1}>
            <TextField
              {...field}
              select
              fullWidth
              label={label}
              error={!!fieldState.error}
              helperText={fieldState.error?.message ?? hint}
              slotProps={{ htmlInput: { 'data-testid': `crm-channel-${name}` } }}
            >
              <MenuItem value="">{t('crm.downloadApp.settings.none')}</MenuItem>
              {channels.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.is_private ? t('crm.downloadApp.settings.privateChannel', { vars: { name: c.name } }) : `#${c.name}`}
                </MenuItem>
              ))}
            </TextField>
            {picked && !picked.is_member && (
              <Alert severity="warning">{t('crm.downloadApp.settings.notMember', { vars: { name: picked.name } })}</Alert>
            )}
          </Stack>
        );
      }}
    />
  );
}

/** CRM Mobile App → Settings: the Slack channel each environment's build is published to. */
export default function CrmAppChannelsForm({ initial, channels, saving, onSubmit }: Readonly<CrmAppChannelsFormProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => crmAppChannelsSchema(t, channels.map((c) => c.id)), [t, channels]);
  const { control, handleSubmit, reset } = useForm<CrmAppChannelsValues>({
    resolver: zodResolver(schema),
    mode: 'onTouched',
    defaultValues: initial,
  });

  // A load or a save brings the stored channels back: show those.
  useEffect(() => reset(initial), [initial, reset]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate data-testid="crm-app-channels-form">
      <Stack spacing={2.5}>
        <ChannelField
          control={control}
          name="production_channel"
          label={t('crm.downloadApp.settings.production')}
          hint={t('crm.downloadApp.settings.productionHint')}
          channels={channels}
          t={t}
        />
        <ChannelField
          control={control}
          name="staging_channel"
          label={t('crm.downloadApp.settings.staging')}
          hint={t('crm.downloadApp.settings.stagingHint')}
          channels={channels}
          t={t}
        />
        <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
          <DuncitButton type="submit" variant="contained" loading={saving} data-testid="crm-channels-save">
            {t('crm.downloadApp.settings.save')}
          </DuncitButton>
        </Stack>
      </Stack>
    </form>
  );
}
