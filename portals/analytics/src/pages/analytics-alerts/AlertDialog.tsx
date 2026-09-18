import { useId } from 'react';
import { useMutation } from '@apollo/client/react';
import { Dialog, DialogTitle } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import { ANALYTICS_ALERTS, CREATE_ANALYTICS_ALERT, UPDATE_ANALYTICS_ALERT, type AnalyticsAlert } from './queries';
import { AnalyticsAlertForm, emptyAlert, toAlertInput, toAlertValues, type AlertValues } from './analytics-alert';

interface Props {
  /** The alert being edited; null adds a new one. */
  alert: AnalyticsAlert | null;
  onClose: () => void;
}

/** Add an alert, or change what an existing one watches and who hears about it. */
export default function AlertDialog({ alert, onClose }: Readonly<Props>) {
  const { t } = useTranslation();
  const titleId = useId();
  const options = { refetchQueries: [ANALYTICS_ALERTS] };
  const [create, created] = useMutation(CREATE_ANALYTICS_ALERT, options);
  const [update, updated] = useMutation(UPDATE_ANALYTICS_ALERT, options);

  const submit = async (values: AlertValues) => {
    const input = toAlertInput(values);
    try {
      if (alert) {
        await update({ variables: { id: alert.id, input } });
        notifySuccess(t('analytics.alerts.saved'));
      } else {
        await create({ variables: { input } });
        notifySuccess(t('analytics.alerts.added'));
      }
      onClose();
    } catch (err) {
      notifyError(parseApiError(err));
    }
  };

  const title = alert ? t('analytics.alerts.editAlert') : t('analytics.alerts.addAlert');
  const defaults = alert ? toAlertValues(alert) : emptyAlert();

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="md" aria-labelledby={titleId}>
      <DialogTitle id={titleId}>{title}</DialogTitle>
      <AnalyticsAlertForm
        defaultValues={defaults}
        busy={created.loading || updated.loading}
        onCancel={onClose}
        onSubmit={submit}
      />
    </Dialog>
  );
}
