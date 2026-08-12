import { useEffect } from 'react';
import { Controller, useForm, type Control } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Autocomplete, Button, Chip, Stack, TextField, Typography } from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import TagIcon from '@mui/icons-material/Tag';
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
  unknownHint: string;
}

/** A stored value is an ID; the picker renders the name it belongs to. */
const channelLabel = (channel: SlackChannel) => `#${channel.name} (${channel.id})`;

/**
 * What is saved is an ID, which on its own says nothing about which channel it
 * is. Resolving it against the bot's channel list lets the field show the name
 * instead — and returning the ID unchanged when nothing matches is what keeps a
 * not-yet-joined channel savable.
 */
const resolveChannel = (value: string, channels: SlackChannel[]): SlackChannel | string =>
  channels.find((channel) => channel.id === value) ?? value;

/** The saved name, or a warning that this ID matched no channel the bot can see. */
function ChannelIdentity({
  resolved,
  unknownHint,
}: Readonly<{ resolved: SlackChannel | string; unknownHint: string }>) {
  if (typeof resolved !== 'string') {
    return (
      <Chip
        size="small"
        variant="outlined"
        color="success"
        icon={resolved.is_private ? <LockIcon /> : <TagIcon />}
        label={resolved.name}
        sx={{ alignSelf: 'flex-start' }}
      />
    );
  }
  if (!resolved.trim()) return null;
  return (
    <Typography variant="caption" color="warning.main">
      {unknownHint}
    </Typography>
  );
}

/**
 * A channel picker that also takes a raw ID: the bot only lists channels it is
 * a member of, and the ID of a channel it has not joined yet must still be
 * savable (the post then works the moment the bot is invited).
 */
function ChannelField({
  control,
  name,
  label,
  hint,
  channels,
  unknownHint,
}: Readonly<ChannelFieldProps>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        // Passing the CHANNEL (not the bare ID) as the value is what makes the
        // input read `#android-builds (C0123ABCD)` — getOptionLabel formats the
        // value the same way it formats an option.
        const resolved = resolveChannel(field.value, channels);
        return (
          <Stack spacing={0.75}>
            <Autocomplete
              freeSolo
              options={channels}
              value={resolved}
              getOptionLabel={(option) =>
                typeof option === 'string' ? option : channelLabel(option)
              }
              isOptionEqualToValue={(option, value) =>
                option.id === (typeof value === 'string' ? value : value.id)
              }
              onChange={(_e, value) => {
                const next = typeof value === 'string' ? value : (value?.id ?? '');
                field.onChange(next);
              }}
              onInputChange={(_e, value, reason) => {
                // Free text is the value; 'reset' fires when an option is picked
                // (and when the list arrives and resolves the stored ID), and
                // would overwrite that ID with the display label.
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
            <ChannelIdentity resolved={resolved} unknownHint={unknownHint} />
          </Stack>
        );
      }}
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
          unknownHint={t('tech.appBuilds.channelUnknown')}
        />
        <ChannelField
          control={control}
          name="ios_channel"
          label={t('tech.appBuilds.iosChannel')}
          hint={t('tech.appBuilds.channelHint')}
          channels={channels}
          unknownHint={t('tech.appBuilds.channelUnknown')}
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
