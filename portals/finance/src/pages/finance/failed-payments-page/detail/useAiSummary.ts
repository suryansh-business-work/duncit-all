import { useCallback, useState } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { notifyError } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import { SUMMARIZE_FAILED_PAYMENT, type SummarizeFailedPaymentData } from '../queries';

/**
 * Ask for the AI refund note. The answer is the whole case under the same id,
 * so Apollo's cache repaints the page from it; a refused request (no access,
 * case gone) is shown as a toast. An AI outage is not an error here: the server
 * stores it on the note, and the card shows it with a retry.
 */
export function useAiSummary(caseId: string) {
  const client = useApolloClient();
  const [busy, setBusy] = useState(false);

  const summarize = useCallback(
    async (force: boolean) => {
      setBusy(true);
      try {
        await client.mutate<SummarizeFailedPaymentData>({ mutation: SUMMARIZE_FAILED_PAYMENT, variables: { caseId, force } });
      } catch (err) {
        notifyError(parseApiError(err));
      } finally {
        setBusy(false);
      }
    },
    [caseId, client],
  );

  return { summarize, busy };
}
