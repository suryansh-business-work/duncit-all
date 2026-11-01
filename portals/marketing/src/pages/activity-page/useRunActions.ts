import { useCallback } from 'react';
import { useMutation } from '@apollo/client/react';
import { notify } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/app-settings';
import {
  CANCEL_MARKETING_RUN,
  DECIDE_MARKETING_RUN,
  RETRY_MARKETING_RUN,
  type MarketingRunDecision,
  type MarketingRunState,
} from './queries';

export interface RunActions {
  /** True while any of the three is in flight — the buttons wait together. */
  busy: boolean;
  retry: () => Promise<void>;
  cancel: () => Promise<void>;
  decide: (decision: MarketingRunDecision, note: string) => Promise<void>;
}

/**
 * The three things a person can do to a run. Each reports how it went in a
 * toast and, when it worked, calls `onChanged` so the drawer and the grid
 * read the run again.
 */
export function useRunActions(runId: string, onChanged: () => void): RunActions {
  const { t } = useTranslation();
  const [retryMut, retryState] = useMutation<{ retryMarketingRun: MarketingRunState }>(RETRY_MARKETING_RUN);
  const [cancelMut, cancelState] = useMutation<{ cancelMarketingRun: MarketingRunState }>(CANCEL_MARKETING_RUN);
  const [decideMut, decideState] = useMutation<{ decideMarketingRun: MarketingRunState }>(DECIDE_MARKETING_RUN);

  const perform = useCallback(
    async (action: () => Promise<unknown>, done: string) => {
      try {
        await action();
        notify(done, 'success');
        onChanged();
      } catch (err) {
        notify(parseApiError(err), 'error');
      }
    },
    [onChanged],
  );

  const retry = useCallback(
    () => perform(() => retryMut({ variables: { id: runId } }), t('marketing.runs.retried')),
    [perform, retryMut, runId, t],
  );
  const cancel = useCallback(
    () => perform(() => cancelMut({ variables: { id: runId } }), t('marketing.runs.cancelled')),
    [perform, cancelMut, runId, t],
  );
  const decide = useCallback(
    (decision: MarketingRunDecision, note: string) =>
      perform(() => decideMut({ variables: { id: runId, decision, note: note || null } }), t('marketing.runs.decided')),
    [perform, decideMut, runId, t],
  );

  return { busy: retryState.loading || cancelState.loading || decideState.loading, retry, cancel, decide };
}
