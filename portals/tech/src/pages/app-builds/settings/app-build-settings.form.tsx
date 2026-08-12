import { useEffect } from 'react';
import { Controller, useForm, type Control } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Autocomplete, Button, Stack, TextField } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import type { SlackChannel } from '../../slack/queries';
import type { AppBuildSettings } from '../queries';
import { appBuildSettingsSchema, type AppBuildSettingsValues } from './app-build-settings.types';

interface Props {
  settings: AppBuildSettings;
  channels: SlackChannel[];
  busy: boolean;
  onSubmit: (values: AppBuildSettingsValues) => void;
}

interface ChannelFieldProps {
  control: Control<AppBuildSettingsValues>;
  name: keyof AppBuildSettingsValues;
  label: string;
  hint: string;
  channels: SlackChannel[];
}

/**
 * A channel picker that also takes a raw ID: the bot only lists channels it is
 * a member of, and the ID of a channel it has not joined yet must still be
 * savable (the post then works the moment the bot is invited).
 */
function ChannelField({ control, name, label, hint, channels }: Readonly<ChannelFieldProps>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Autocomplete
          freeSolo
          options={channels}
          value={field.value}
          getOptionLabel={(option) =>
            typeof option === 'string' ? option : `#${option.name} (${option.id})`
          }
          isOptionEqualToValue={(option, value) =>
            option.id === (typeof value === 'string' ? value : value.id)
          }
          onChange={(_e, value) => {
            const next = typeof value === 'string' ? value : (value?.id ?? '');
            field.onChange(next);
          }}
          onInputChange={(_e, value, reason) => {
            // Free text is the value; 'reset' fires when an option is picked and
            // would overwrite the ID we just stored with the display label.
            if (reason !== 'reset') field.onChange(value);
          }}
          renderInput={(params) => (
            <TextField
              {...params}
              label={label}
              error={!!fieldState.error}
              helperText={fieldState.error?.message ?? hint}
              onBlur={field.onBlur}
            />
          )}
        />
      )}
    />
  );
}

export default function AppBuildSettingsForm({
  settings,
  channels,
  busy,
  onSubmit,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const messages = { channelFormat: t('tech.appBuilds.channelFormat') };
  const { control, handleSubmit, reset } = useForm<AppBuildSettingsValues>({
    defaultValues: {
      android_channel: settings.android_channel ?? '',
      ios_channel: settings.ios_channel ?? '',
    },
    resolver: zodResolver(appBuildSettingsSchema(messages)),
    mode: 'all',
  });

  // Server round-trips (load + save) re-arm the form with what is now stored.
  useEffect(() => {
    reset({
      android_channel: settings.android_channel ?? '',
      ios_channel: settings.ios_channel ?? '',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.android_channel, settings.ios_channel]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <Stack spacing={2.5}>
        <ChannelField
          control={control}
          name="android_channel"
          label={t('tech.appBuilds.androidChannel')}
          hint={t('tech.appBuilds.channelHint')}
          channels={channels}
        />
        <ChannelField
          control={control}
          name="ios_channel"
          label={t('tech.appBuilds.iosChannel')}
          hint={t('tech.appBuilds.channelHint')}
          channels={channels}
        />
        <Stack direction="row" justifyContent="flex-end">
          <Button type="submit" variant="contained" disabled={busy}>
            {busy ? t('tech.appBuilds.saving') : t('tech.appBuilds.save')}
          </Button>
        </Stack>
      </Stack>
    </form>
  );
}
