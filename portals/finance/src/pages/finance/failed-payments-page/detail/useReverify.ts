import { useCallback, useState } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/app-settings';
import { REVERIFY_FAILED_PAYMENT, type FailedPaymentDetail } from '../queries';

type ReverifyData = { reverifyFailedPayment: FailedPaymentDetail };

/** Re-run the AI + Razorpay check on the case's latest evidence; the answer is the fresh case. */
export function useReverify(caseId: string, onDone: (detail: FailedPaymentDetail) => void) {
  const { t } = useTranslation();
  const client = useApolloClient();
  const [busy, setBusy] = useState(false);

  const reverify = useCallback(async () => {
    setBusy(true);
    try {
      const { data } = await client.mutate<ReverifyData>({ mutation: REVERIFY_FAILED_PAYMENT, variables: { caseId } });
      notifySuccess(t('finance.failedPayments.reverified'));
      if (data) onDone(data.reverifyFailedPayment);
    } catch (err) {
      // Razorpay unreachable, no evidence yet … the server says which.
      notifyError(parseApiError(err));
    } finally {
      setBusy(false);
    }
  }, [caseId, client, onDone, t]);

  return { reverify, busy };
}
