import { useCallback, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { logs } from '@duncit/logs';
import {
  MY_WHATSAPP_PREFERENCE,
  SET_ALL_MY_WHATSAPP_PREFERENCES,
  SET_MY_WHATSAPP_PREFERENCE,
  type WhatsAppPreference,
} from './queries';

/**
 * The WhatsApp Preference screen's data.
 *
 * Mail Preference's twin minus its second door: an unsubscribe link in an email
 * has no equivalent here, so there is one query and one session. What it gains
 * instead is `reachable` — whether there is a number to message at all — which
 * the server answers and this hook only passes on.
 */
export function useWhatsAppPreferences() {
  const [saveFailed, setSaveFailed] = useState(false);
  const [saved, setSaved] = useState(false);
  const [busyCategory, setBusyCategory] = useState<string | null>(null);

  const { data, loading } = useQuery<{ myWhatsappPreference: WhatsAppPreference }>(
    MY_WHATSAPP_PREFERENCE,
    { fetchPolicy: 'cache-and-network' },
  );

  const [setOne] = useMutation<any>(SET_MY_WHATSAPP_PREFERENCE);
  const [setEvery] = useMutation<any>(SET_ALL_MY_WHATSAPP_PREFERENCES);

  const preference = data?.myWhatsappPreference ?? null;

  /**
   * One save, whichever mutation it is.
   *
   * The failure is reported as a flag rather than the thrown message: a raw
   * Apollo string ("Response not successful: 500") is neither localized nor
   * anything the reader can act on (rule 38). It still reaches the log, where
   * somebody can actually use it.
   */
  const run = useCallback(
    async (category: string, enabled: boolean, work: () => Promise<unknown>) => {
      setBusyCategory(category);
      setSaveFailed(false);
      try {
        await work();
        setSaved(true);
      } catch (error) {
        setSaveFailed(true);
        logs.mWeb.error('useWhatsAppPreferences', 'save', { error, category, enabled });
      } finally {
        setBusyCategory(null);
      }
    },
    [],
  );

  /** Toggle one category. The mutation returns the whole sheet, so the cache
   * lands on the same shape the query wrote and nothing needs refetching. */
  const setCategory = useCallback(
    (category: string, enabled: boolean) =>
      run(category, enabled, () => setOne({ variables: { category, enabled } })),
    [run, setOne],
  );

  /** Everything optional, in one action. The required three are the server's to
   * refuse — asking it to turn them off is not something this screen can do. */
  const setAll = useCallback(
    (enabled: boolean) => run('__all__', enabled, () => setEvery({ variables: { enabled } })),
    [run, setEvery],
  );

  return {
    preference,
    loading: loading && !preference,
    saveFailed,
    saved,
    dismissSaved: () => setSaved(false),
    busyCategory,
    setCategory,
    setAll,
  };
}
