import { useCallback, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { useTranslation } from '@duncit/app-settings';
import { notify } from '@duncit/dialogs';
import { parseApiError } from '@duncit/utils';
import {
  RECONCILE_WHATSAPP_SCENARIOS,
  SET_WHATSAPP_SCENARIO_ENABLED,
  SET_WHATSAPP_SCENARIO_MEDIA,
  WHATSAPP_SCENARIOS,
  type WaScenarioBoard,
} from './queries';

interface BoardData {
  whatsappScenarios: WaScenarioBoard;
}

/**
 * The scenario board, and the two writes that replace it.
 *
 * Both mutations answer with the WHOLE board, so the answer is kept rather than
 * refetched — the board has no ids for Apollo to normalize by, and a refetch
 * would ask the server to rebuild the same AiSensy join it just sent back.
 */
export function useWhatsappBoard() {
  const { t } = useTranslation();
  const [written, setWritten] = useState<WaScenarioBoard | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [reconciling, setReconciling] = useState(false);

  const { data, loading, error } = useQuery<BoardData>(WHATSAPP_SCENARIOS, {
    fetchPolicy: 'network-only',
  });
  const [setEnabled] = useMutation<any>(SET_WHATSAPP_SCENARIO_ENABLED);
  const [reconcile] = useMutation<any>(RECONCILE_WHATSAPP_SCENARIOS);
  const [setMedia] = useMutation<any>(SET_WHATSAPP_SCENARIO_MEDIA);
  const [savingMedia, setSavingMedia] = useState(false);

  const board = written ?? data?.whatsappScenarios ?? null;

  const toggle = useCallback(
    async (eventKey: string, enabled: boolean) => {
      setBusyKey(eventKey);
      try {
        const result = await setEnabled({ variables: { event_key: eventKey, enabled } });
        setWritten(result.data?.setWhatsappScenarioEnabled ?? null);
      } catch (err) {
        notify(parseApiError(err, t('adminWhatsapp.toggleFailed')), 'error');
      } finally {
        setBusyKey(null);
      }
    },
    [setEnabled, t]
  );

  /** Writes only the admin override (url '' clears it); true when it stuck, so
   * the dialog knows to close rather than losing what was typed on a failure. */
  const saveMedia = useCallback(
    async (eventKey: string, url: string, filename: string) => {
      setSavingMedia(true);
      try {
        const result = await setMedia({ variables: { event_key: eventKey, url, filename } });
        setWritten(result.data?.setWhatsappScenarioMedia ?? null);
        notify(t('adminWhatsapp.mediaSaved'), 'success');
        return true;
      } catch (err) {
        notify(parseApiError(err, t('adminWhatsapp.mediaSaveFailed')), 'error');
        return false;
      } finally {
        setSavingMedia(false);
      }
    },
    [setMedia, t]
  );

  const runReconcile = useCallback(async () => {
    setReconciling(true);
    try {
      const result = await reconcile();
      setWritten(result.data?.reconcileWhatsappScenarios ?? null);
      notify(t('adminWhatsapp.reconciled'), 'success');
    } catch (err) {
      notify(parseApiError(err, t('adminWhatsapp.reconcileFailed')), 'error');
    } finally {
      setReconciling(false);
    }
  }, [reconcile, t]);

  return {
    board,
    loading: loading && !board,
    loadFailed: Boolean(error) && !board,
    busyKey,
    reconciling,
    savingMedia,
    toggle,
    saveMedia,
    runReconcile,
  };
}
