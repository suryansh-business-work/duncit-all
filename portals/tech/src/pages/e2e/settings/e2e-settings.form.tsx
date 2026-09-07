import { Controller, useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, Divider, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import SlackChannelField from '../../../components/SlackChannelField';
import SuitePicker from '../SuitePicker';
import type { SlackChannel } from '../../slack/queries';
import type { E2eRunSettings, E2eSuite } from '../queries';
import ScheduleFields from './ScheduleFields';
import IdentityFields from './IdentityFields';
import {
  e2eSettingsSchema,
  toFormValues,
  type E2eSettingsValues,
} from './e2e-settings.types';

interface Props {
  settings: E2eRunSettings;
  suites: E2eSuite[];
  channels: SlackChannel[];
  busy: boolean;
  onSubmit: (values: E2eSettingsValues) => void;
}

export default function E2eSettingsForm({
  settings,
  suites,
  channels,
  busy,
  onSubmit,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const { control, handleSubmit, watch, formState } = useForm<
    E2eSettingsValues,
    any,
    E2eSettingsValues
  >({
    defaultValues: {
      ...toFormValues(settings),
      // An empty saved list means "every suite"; the picker shows that as all
      // of them ticked, and toSettingsInput turns it back on the way out.
      suites: settings.suites.length === 0 ? suites.map((suite) => suite.key) : settings.suites,
    },
    resolver: zodResolver(
      e2eSettingsSchema({
        refFormat: t('tech.e2e.refFormat'),
        timeFormat: t('tech.e2e.timeFormat'),
        keepLastRange: t('tech.e2e.keepLastRange'),
        identityIncomplete: t('tech.e2e.identityIncomplete'),
        domainFormat: t('tech.e2e.domainFormat'),
        channelFormat: t('tech.e2e.channelFormat'),
      })
    ) as unknown as Resolver<E2eSettingsValues, any, E2eSettingsValues>,
    mode: 'all',
  });

  const weekly = watch('frequency') === 'WEEKLY';

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <Stack spacing={3}>
        <Stack spacing={0.5}>
          <Typography variant="subtitle2">{t('tech.e2e.scheduleHeading')}</Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {t('tech.e2e.scheduleHint')}
          </Typography>
        </Stack>
        <ScheduleFields control={control} errors={formState.errors} weekly={weekly} />

        <Divider />
        <Controller
          control={control}
          name="suites"
          render={({ field, fieldState }) => (
            <SuitePicker
              suites={suites}
              value={field.value}
              onChange={field.onChange}
              label={t('tech.e2e.scheduleSuites')}
              error={fieldState.error?.message}
            />
          )}
        />

        <Divider />
        <Stack spacing={0.5}>
          <Typography variant="subtitle2">{t('tech.e2e.identityHeading')}</Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {t('tech.e2e.identityHint')}
          </Typography>
        </Stack>
        <IdentityFields
          control={control}
          errors={formState.errors}
          passwordSet={settings.password_set}
        />

        <Divider />
        <Stack spacing={0.5}>
          <Typography variant="subtitle2">{t('tech.e2e.slackHeading')}</Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {t('tech.e2e.slackHint')}
          </Typography>
        </Stack>
        {settings.slack_configured ? (
          <SlackChannelField
            control={control}
            name="slack_channel"
            label={t('tech.e2e.slackChannel')}
            hint={t('tech.e2e.slackChannelHint')}
            channels={channels}
            unknownHint={t('tech.e2e.slackChannelUnknown')}
          />
        ) : (
          <Alert severity="info" variant="outlined">
            {t('tech.e2e.slackNotConfigured')}
          </Alert>
        )}

        <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
          <DuncitButton type="submit" variant="contained" disabled={busy}>
            {busy ? t('shell.common.saving') : t('shell.common.save')}
          </DuncitButton>
        </Stack>
      </Stack>
    </form>
  );
}
