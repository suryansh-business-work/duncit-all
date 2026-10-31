import { useMutation, useQuery } from '@apollo/client/react';
import { Alert, Stack, Typography } from '@mui/material';
import { notify } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/app-settings';
import { POD_PROMO_SETTINGS, SCHEDULE_POD_PROMO, type PodBannerStyle, type PodPromoSettings } from '../queries';
import { useSettingsOptions } from '../settings/useSettingsOptions';
import { PromoScheduleForm, toScheduleVariables, type PromoScheduleFormValues } from '../promo-schedule-form';

interface Props {
  podId: string;
  podTitle: string;
  style: PodBannerStyle | null;
  /** The promotion's collaborators, when it has some; null leaves them to the server. */
  collaborators: string[] | null;
  /** The pod is promoted — the table and the summary re-read. */
  onScheduled: () => void;
}

/** A manager schedules the carousel they just made, as one promotion with its tracking link. */
export default function ScheduleSection({ podId, podTitle, style, collaborators, onScheduled }: Readonly<Props>) {
  const { t } = useTranslation();
  const { options, error: optionsError } = useSettingsOptions();
  const { data } = useQuery<{ podPromoSettings: PodPromoSettings }>(POD_PROMO_SETTINGS, { fetchPolicy: 'cache-first' });
  const [schedule, { loading }] = useMutation(SCHEDULE_POD_PROMO, { refetchQueries: ['PodPromoSummary', 'PodPromoCandidates'] });

  const submit = async (values: PromoScheduleFormValues, collaboratorsChosen: boolean) => {
    try {
      await schedule({ variables: toScheduleVariables(values, podId, style, collaboratorsChosen) });
      notify(t('marketing.podPromo.promoted', { vars: { title: podTitle } }), 'success');
      onScheduled();
    } catch (err) {
      notify(parseApiError(err), 'error');
    }
  };

  return (
    <Stack spacing={1.5} data-testid="banner-schedule-section">
      <Typography variant="subtitle1" component="h3">
        {t('marketing.podPromo.scheduleTitle')}
      </Typography>
      {optionsError && <Alert severity="error">{parseApiError(optionsError)}</Alert>}
      <PromoScheduleForm
        accounts={options.accounts}
        collaborators={collaborators}
        timeZone={data?.podPromoSettings.time_zone ?? ''}
        busy={loading}
        onSubmit={submit}
      />
    </Stack>
  );
}
