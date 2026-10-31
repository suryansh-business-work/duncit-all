import { useCallback } from 'react';
import { useMutation } from '@apollo/client/react';
import { notify } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/app-settings';
import { MARKETING_AGENTS, RUN_MARKETING_AGENT, UPDATE_MARKETING_AGENT, type MarketingAgent, type MarketingAgentKey, type UpdateMarketingAgentInput } from './queries';

export interface AgentActions {
  /** True while a save or a run is in flight — the card's controls wait together. */
  busy: boolean;
  /** Save what the form holds, or just the switch. Resolves true when it landed. */
  save: (input: UpdateMarketingAgentInput) => Promise<boolean>;
  /** Start a run as the signed-in person. */
  run: () => Promise<void>;
}

/**
 * What a manager can do to one agent. Each reports how it went in a toast;
 * both read the list again afterwards, because an agent is keyed by its
 * catalogue key, not an id, so the cache cannot merge the answer on its own.
 */
export function useAgentActions(key: MarketingAgentKey): AgentActions {
  const { t } = useTranslation();
  const refetch = { refetchQueries: [MARKETING_AGENTS], awaitRefetchQueries: true };
  const [updateMut, updateState] = useMutation<{ updateMarketingAgent: MarketingAgent }>(UPDATE_MARKETING_AGENT, refetch);
  const [runMut, runState] = useMutation<{ runMarketingAgent: string }>(RUN_MARKETING_AGENT, refetch);

  const save = useCallback(
    async (input: UpdateMarketingAgentInput) => {
      try {
        await updateMut({ variables: { key, input } });
        notify(t('marketing.agents.saved'), 'success');
        return true;
      } catch (err) {
        notify(parseApiError(err), 'error');
        return false;
      }
    },
    [key, t, updateMut],
  );

  const run = useCallback(async () => {
    try {
      await runMut({ variables: { key } });
      notify(t('marketing.agents.runStarted'), 'success');
    } catch (err) {
      notify(parseApiError(err), 'error');
    }
  }, [key, t, runMut]);

  return { busy: updateState.loading || runState.loading, save, run };
}
