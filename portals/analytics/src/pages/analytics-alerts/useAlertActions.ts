import { useCallback, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { useTranslation } from '@duncit/app-settings';
import { notify, notifyError, notifySuccess, useConfirm } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import { ANALYTICS_ALERTS, CHECK_ANALYTICS_ALERT_NOW, DELETE_ANALYTICS_ALERT, type AnalyticsAlert } from './queries';
import { alertErrorKey } from './alert-errors';

const reportError = (err: unknown) => notifyError(parseApiError(err));

/**
 * A row's two server actions. Check now reads the tile this minute and, if it
 * tripped, mails its people straight away — the way to see what they receive.
 * Removing an alert always asks first, naming it.
 */
export function useAlertActions() {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const refetch = { refetchQueries: [ANALYTICS_ALERTS] };
  const [checkNow] = useMutation(CHECK_ANALYTICS_ALERT_NOW, refetch);
  const [remove] = useMutation(DELETE_ANALYTICS_ALERT, refetch);
  const [checkingId, setCheckingId] = useState<string | null>(null);

  const check = useCallback(
    async (row: AnalyticsAlert) => {
      const { data } = await checkNow({ variables: { id: row.id } });
      const result = data?.checkAnalyticsAlertNow;
      if (!result) return;
      if (result.status === 'ERROR') notifyError(t(alertErrorKey(result.error)));
      else if (result.status === 'OK') notify(t('analytics.alerts.checkedOk', { vars: { name: row.name } }));
      else if (result.notified) notifySuccess(t('analytics.alerts.checkedTripped', { vars: { name: row.name } }));
      else notifyError(t('analytics.alerts.checkedNotSent', { vars: { name: row.name } }));
    },
    [checkNow, t]
  );

  const removeRow = useCallback(
    async (row: AnalyticsAlert) => {
      const ok = await confirm({
        title: t('analytics.alerts.removeTitle'),
        message: t('analytics.alerts.removeMessage', { vars: { name: row.name } }),
        confirmLabel: t('analytics.alerts.remove'),
        cancelLabel: t('analytics.alerts.cancel'),
        destructive: true,
      });
      if (!ok) return;
      await remove({ variables: { id: row.id } });
      notifySuccess(t('analytics.alerts.removed'));
    },
    [confirm, remove, t]
  );

  const onCheck = useCallback(
    (row: AnalyticsAlert) => {
      setCheckingId(row.id);
      check(row)
        .catch(reportError)
        .finally(() => setCheckingId(null));
    },
    [check]
  );

  const onDelete = useCallback(
    (row: AnalyticsAlert) => {
      removeRow(row).catch(reportError);
    },
    [removeRow]
  );

  return { onCheck, onDelete, checkingId };
}
