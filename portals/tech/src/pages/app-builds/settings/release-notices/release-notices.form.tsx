import { useEffect } from 'react';
import { Controller, useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Stack, TextField } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import SlackChannelField from '../../../../components/SlackChannelField';
import SwitchRow from '../../../../components/SwitchRow';
import type { SlackChannel } from '../../../../lib/slack-queries';
import type { StoreReleaseSettings } from '../../releases/queries';
import {
  MAX_REMINDER_HOURS,
  MIN_REMINDER_HOURS,
  releaseNoticesSchema,
  toFormValues,
  type ReleaseNoticesValues,
} from './release-notices.types';

interface Props {
  settings: StoreReleaseSettings;
  channels: SlackChannel[];
  busy: boolean;
  onSubmit: (values: ReleaseNoticesValues) => void;
}

export default function ReleaseNoticesForm({ settings, channels, busy, onSubmit }: Readonly<Props>) {
  const { t } = useTranslation();
  const hoursRange = t('tech.appBuilds.releaseNoticesHoursRange', {
    vars: { min: String(MIN_REMINDER_HOURS), max: String(MAX_REMINDER_HOURS) },
  });
  const { control, handleSubmit, reset } = useForm<ReleaseNoticesValues, any, ReleaseNoticesValues>({
    defaultValues: toFormValues(settings),
    resolver: zodResolver(
      releaseNoticesSchema({
        channelFormat: t('tech.appBuilds.channelFormat'),
        mailInvalid: t('tech.appBuilds.releaseNoticesMailInvalid'),
        mailRequired: t('tech.appBuilds.releaseNoticesMailRequired'),
        hoursRange,
      })
    ) as unknown as Resolver<ReleaseNoticesValues, any, ReleaseNoticesValues>,
    mode: 'all',
  });

  // Server round-trips (load + save) re-arm the form with what is now stored.
  useEffect(() => {
    reset(toFormValues(settings));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.updated_at]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate data-testid="release-notices-form">
      <Stack spacing={2.5}>
        <Controller
          control={control}
          name="notify_enabled"
          render={({ field }) => (
            <SwitchRow
              checked={field.value}
              onChange={field.onChange}
              label={t('tech.appBuilds.releaseNoticesEnabled')}
              hint={t('tech.appBuilds.releaseNoticesEnabledHint')}
            />
          )}
        />
        <SlackChannelField
          control={control}
          name="slack_channel"
          label={t('tech.appBuilds.releaseNoticesChannel')}
          hint={t('tech.appBuilds.releaseNoticesChannelHint')}
          channels={channels}
          unknownHint={t('tech.appBuilds.channelUnknown')}
        />
        <RhfTextField
          control={control}
          name="mail_to_text"
          label={t('tech.appBuilds.releaseNoticesMailTo')}
          hint={t('tech.appBuilds.releaseNoticesMailToHint')}
          multiline
          minRows={2}
          required
        />
        <Controller
          control={control}
          name="reminders_enabled"
          render={({ field }) => (
            <SwitchRow
              checked={field.value}
              onChange={field.onChange}
              label={t('tech.appBuilds.releaseNoticesReminders')}
              hint={t('tech.appBuilds.releaseNoticesRemindersHint')}
            />
          )}
        />
        <Controller
          control={control}
          name="reminder_hours"
          render={({ field: { ref, ...field }, fieldState }) => (
            <TextField
              {...field}
              inputRef={ref}
              type="number"
              label={t('tech.appBuilds.releaseNoticesHours')}
              error={Boolean(fieldState.error)}
              helperText={fieldState.error?.message ?? hoursRange}
              slotProps={{ htmlInput: { min: MIN_REMINDER_HOURS, max: MAX_REMINDER_HOURS, step: 1 } }}
              // The input yields a string; the schema and the server want a number.
              onChange={(e) => field.onChange(Number(e.target.value))}
              sx={{ maxWidth: 240 }}
            />
          )}
        />
        <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
          <DuncitButton type="submit" variant="contained" loading={busy}>
            {busy ? t('tech.appBuilds.saving') : t('tech.appBuilds.save')}
          </DuncitButton>
        </Stack>
      </Stack>
    </form>
  );
}
