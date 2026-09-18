import { useMutation, useQuery } from '@apollo/client/react';
import { Alert, Stack } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import { Loader, SectionCard } from '@duncit/ui';
import { parseApiError } from '@duncit/utils';
import { AnalyticsMailScheduleForm, type ScheduleValues } from './analytics-mail-schedule';
import {
  ANALYTICS_MAIL_SETTINGS,
  ANALYTICS_MAIL_SUBSCRIPTIONS,
  UPDATE_ANALYTICS_MAIL_SETTINGS,
} from './queries';

/**
 * When reports go out. Saving refetches the subscribers too, because each
 * row's "next send" is computed from this schedule.
 */
export default function ScheduleCard() {
  const { t } = useTranslation();
  const { data, error } = useQuery(ANALYTICS_MAIL_SETTINGS);
  const [save, { loading: saving }] = useMutation(UPDATE_ANALYTICS_MAIL_SETTINGS, {
    refetchQueries: [ANALYTICS_MAIL_SUBSCRIPTIONS],
  });
  const settings = data?.analyticsMailSettings;

  const onSubmit = (values: ScheduleValues) => {
    save({ variables: { input: values } })
      .then(() => notifySuccess(t('analytics.mails.scheduleSaved')))
      .catch((err: unknown) => notifyError(parseApiError(err)));
  };

  let body = <Loader variant="block" />;
  if (settings) {
    const paused = settings.enabled ? null : <Alert severity="info">{t('analytics.mails.pausedHint')}</Alert>;
    body = (
      <Stack spacing={2}>
        {paused}
        <AnalyticsMailScheduleForm settings={settings} busy={saving} onSubmit={onSubmit} />
      </Stack>
    );
  } else if (error) {
    body = <Alert severity="error">{parseApiError(error)}</Alert>;
  }

  return (
    <SectionCard title={t('analytics.mails.scheduleTitle')} subtitle={t('analytics.mails.scheduleHint')}>
      {body}
    </SectionCard>
  );
}
