import { useCallback, useState } from 'react';
import { useApolloClient, useMutation } from '@apollo/client';
import { notifyError, notifySuccess } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/app-settings';
import { PAYMENT_DETAIL, RETRY_PAYMENT_STEPS, type PaymentDetail } from './queries';

/** The token `busyKey` carries while the page-level Retry all is running. */
export const RETRY_ALL = '__all__';

export interface RetryApi {
  /** One step key, or null for everything this payment still owes. */
  retry: (stepKey: string | null) => Promise<void>;
  /** The step being re-run right now, `RETRY_ALL`, or null when idle. */
  busyKey: string | null;
}

interface RetryData {
  retryPaymentSteps: PaymentDetail;
}

/**
 * Re-run failed checkout work and refresh the audit from the answer.
 *
 * The mutation returns the whole detail, so its result is written straight into
 * the page's query instead of firing a refetch: a re-run that resent an e-mail
 * and a refetch that raced it would show the page as it was a moment before the
 * write it was meant to prove.
 */
export function useRetrySteps(paymentDocId: string): RetryApi {
  const { t } = useTranslation();
  const client = useApolloClient();
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [mutate] = useMutation<RetryData>(RETRY_PAYMENT_STEPS, {
    update(cache, { data }) {
      if (!data?.retryPaymentSteps) return;
      cache.writeQuery({
        query: PAYMENT_DETAIL,
        variables: { id: paymentDocId },
        data: { paymentDetail: data.retryPaymentSteps },
      });
    },
  });

  const retry = useCallback(
    async (stepKey: string | null) => {
      setBusyKey(stepKey ?? RETRY_ALL);
      try {
        await mutate({
          variables: { id: paymentDocId, stepKeys: stepKey ? [stepKey] : null },
        });
        notifySuccess(t('finance.payment.retryDone'));
      } catch (error) {
        // The server's message names WHICH step refused and why — a generic
        // "retry failed" would send Finance back to the logs to find out.
        notifyError(parseApiError(error));
        // A failed re-run still WROTE: the attempt counter moved and a new
        // finalize error was recorded. Only a success carries the fresh audit
        // back in its reply, so a failure has to go and ask for it.
        await client.refetchQueries({ include: [PAYMENT_DETAIL] });
      } finally {
        setBusyKey(null);
      }
    },
    [client, mutate, paymentDocId, t],
  );

  return { retry, busyKey };
}
