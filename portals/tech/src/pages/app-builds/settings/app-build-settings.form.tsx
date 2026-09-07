import { useEffect } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Stack } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import SlackChannelField from '../../../components/SlackChannelField';
import type { SlackChannel } from '../../slack/queries';
import type { AppBuildSettings } from '../queries';
import { appBuildSettingsSchema, type AppBuildSettingsValues } from './app-build-settings.types';

interface Props {
  settings: AppBuildSettings;
  channels: SlackChannel[];
  busy: boolean;
  onSubmit: (values: AppBuildSettingsValues) => void;
}

export default function AppBuildSettingsForm({
  settings,
  channels,
  busy,
  onSubmit,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const messages = { channelFormat: t('tech.appBuilds.channelFormat') };
  const { control, handleSubmit, reset } = useForm<AppBuildSettingsValues, any, AppBuildSettingsValues>({
    defaultValues: {
      android_channel: settings.android_channel ?? '',
      ios_channel: settings.ios_channel ?? '',
    },
    resolver: zodResolver(appBuildSettingsSchema(messages)) as unknown as Resolver<AppBuildSettingsValues, any, AppBuildSettingsValues>,
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
        <SlackChannelField
          control={control}
          name="android_channel"
          label={t('tech.appBuilds.androidChannel')}
          hint={t('tech.appBuilds.channelHint')}
          channels={channels}
          unknownHint={t('tech.appBuilds.channelUnknown')}
        />
        <SlackChannelField
          control={control}
          name="ios_channel"
          label={t('tech.appBuilds.iosChannel')}
          hint={t('tech.appBuilds.channelHint')}
          channels={channels}
          unknownHint={t('tech.appBuilds.channelUnknown')}
        />
        <Stack direction="row" sx={{
          justifyContent: "flex-end"
        }}>
          <DuncitButton type="submit" variant="contained" disabled={busy}>
            {busy ? t('tech.appBuilds.saving') : t('tech.appBuilds.save')}
          </DuncitButton>
        </Stack>
      </Stack>
    </form>
  );
}
