import { useCallback, useEffect, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';
import { logs } from '@duncit/logs';

import {
  MobileSetAllWhatsappPreferencesDocument,
  MobileSetWhatsappPreferenceDocument,
  MobileWhatsappPreferenceDocument,
} from '@/graphql/whatsapp-preference';
import { graphqlRequest } from '@/services/graphql.client';

export type WhatsAppPreference = ResultOf<
  typeof MobileWhatsappPreferenceDocument
>['myWhatsappPreference'];
export type WhatsAppPreferenceCategory = WhatsAppPreference['categories'][number];

/** The key `setAll` reports itself as while it runs, so the bulk button can go
 * busy without any single row's switch doing so. */
export const ALL_WHATSAPP_CATEGORIES = '__all__';

/**
 * WhatsApp Preference data + mutations — RN twin of mWeb's
 * `useWhatsAppPreferences`.
 *
 * Every mutation returns the whole sheet, so there is no refetch and no local
 * merge: what the server says is what renders, and two devices toggling at once
 * cannot leave the screen showing a state the server never held.
 */
export function useWhatsAppPreferences() {
  const [preference, setPreference] = useState<WhatsAppPreference | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [saved, setSaved] = useState(false);
  const [busyCategory, setBusyCategory] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    graphqlRequest(MobileWhatsappPreferenceDocument, undefined, { auth: true })
      .then((data) => active && setPreference(data.myWhatsappPreference))
      .catch(() => active && setLoadFailed(true))
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, []);

  /**
   * One save. The failure is a flag rather than the thrown message, matching
   * mWeb: a transport string is neither localized nor actionable (rule 38), and
   * the detail belongs in the log instead.
   */
  const run = useCallback(
    async (key: string, enabled: boolean, work: () => Promise<WhatsAppPreference>) => {
      if (busyCategory !== null) return;
      setBusyCategory(key);
      setSaveFailed(false);
      try {
        setPreference(await work());
        setSaved(true);
      } catch (error) {
        setSaveFailed(true);
        logs.mobileApp.error('useWhatsAppPreferences', 'save', { error, category: key, enabled });
      } finally {
        setBusyCategory(null);
      }
    },
    [busyCategory],
  );

  const setCategory = useCallback(
    (category: string, enabled: boolean) =>
      run(category, enabled, () =>
        graphqlRequest(
          MobileSetWhatsappPreferenceDocument,
          { category, enabled },
          { auth: true },
        ).then((data) => data.setMyWhatsappPreference),
      ),
    [run],
  );

  const setAll = useCallback(
    (enabled: boolean) =>
      run(ALL_WHATSAPP_CATEGORIES, enabled, () =>
        graphqlRequest(MobileSetAllWhatsappPreferencesDocument, { enabled }, { auth: true }).then(
          (data) => data.setAllMyWhatsappPreferences,
        ),
      ),
    [run],
  );

  return {
    preference,
    isLoading,
    loadFailed,
    saveFailed,
    saved,
    dismissSaved: useCallback(() => setSaved(false), []),
    busyCategory,
    setCategory,
    setAll,
  };
}
