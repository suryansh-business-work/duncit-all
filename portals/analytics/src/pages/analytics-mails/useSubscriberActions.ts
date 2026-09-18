import { useCallback, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { useTranslation } from '@duncit/app-settings';
import { notifyError, notifySuccess, useConfirm } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import {
  ANALYTICS_MAIL_SUBSCRIPTIONS,
  DELETE_ANALYTICS_MAIL_SUBSCRIPTION,
  SEND_ANALYTICS_MAIL_NOW,
  type AnalyticsMailSubscription,
} from './queries';

const reportError = (err: unknown) => notifyError(parseApiError(err));

/**
 * A row's two server actions. Send now builds and mails the real report —
 * the way to see exactly what a subscriber receives — and says why when it
 * did not go. Removing someone always asks first, naming who.
 */
export function useSubscriberActions() {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const refetch = { refetchQueries: [ANALYTICS_MAIL_SUBSCRIPTIONS] };
  const [sendNow] = useMutation(SEND_ANALYTICS_MAIL_NOW, refetch);
  const [remove] = useMutation(DELETE_ANALYTICS_MAIL_SUBSCRIPTION, refetch);
  const [sendingId, setSendingId] = useState<string | null>(null);

  const sendReport = useCallback(
    async (row: AnalyticsMailSubscription) => {
      const { data } = await sendNow({ variables: { id: row.id } });
      const result = data?.sendAnalyticsMailNow;
      if (result?.ok) notifySuccess(t('analytics.mails.sent', { vars: { email: row.email } }));
      else notifyError(result?.message || t('analytics.mails.sendFailed'));
    },
    [sendNow, t]
  );

  const removeRow = useCallback(
    async (row: AnalyticsMailSubscription) => {
      const ok = await confirm({
        title: t('analytics.mails.removeTitle'),
        message: t('analytics.mails.removeMessage', { vars: { name: row.name, email: row.email } }),
        confirmLabel: t('analytics.mails.remove'),
        cancelLabel: t('analytics.mails.cancel'),
        destructive: true,
      });
      if (!ok) return;
      await remove({ variables: { id: row.id } });
      notifySuccess(t('analytics.mails.removed'));
    },
    [confirm, remove, t]
  );

  const onSend = useCallback(
    (row: AnalyticsMailSubscription) => {
      setSendingId(row.id);
      sendReport(row)
        .catch(reportError)
        .finally(() => setSendingId(null));
    },
    [sendReport]
  );

  const onDelete = useCallback(
    (row: AnalyticsMailSubscription) => {
      removeRow(row).catch(reportError);
    },
    [removeRow]
  );

  return { onSend, onDelete, sendingId };
}
