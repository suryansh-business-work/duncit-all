import { useCallback, useEffect, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';
import { logs } from '@duncit/logs';

import {
  MobileMailPreferencesDocument,
  MobileSetAllMailPreferencesDocument,
  MobileSetMailPreferenceDocument,
} from '@/graphql/mail-preference';
import { graphqlRequest } from '@/services/graphql.client';

export type MailPreference = ResultOf<typeof MobileMailPreferencesDocument>['myMailPreferences'];
export type MailPreferenceCategory = MailPreference['categories'][number];

/** The key `setAll` reports itself as while it runs, so the bulk button can go
 * busy without any single row's switch doing so. */
export const ALL_CATEGORIES = '__all__';

/**
 * Mail Preference data + mutations — RN twin of mWeb's `useMailPreferences`.
 *
 * Every mutation returns the whole sheet, so there is no refetch and no local
 * merge: what the server says is what renders, and two devices toggling at once
 * cannot leave the screen showing a state the server never held.
 */
export function useMailPreferences() {
  const [preference, setPreference] = useState<MailPreference | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  const [saved, setSaved] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);
  const [busyCategory, setBusyCategory] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    graphqlRequest(MobileMailPreferencesDocument, undefined, { auth: true })
      .then((data) => active && setPreference(data.myMailPreferences))
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
    async (key: string, enabled: boolean, work: () => Promise<MailPreference>) => {
      if (busyCategory !== null) return;
      setBusyCategory(key);
      setSaveFailed(false);
      try {
        setPreference(await work());
        setSaved(true);
        // The server confirms by email on the way OUT only.
        setConfirmationSent(!enabled);
      } catch (error) {
        setSaveFailed(true);
        logs.mobileApp.error('useMailPreferences', 'save', { error, category: key, enabled });
      } finally {
        setBusyCategory(null);
      }
    },
    [busyCategory],
  );

  const setCategory = useCallback(
    (category: string, enabled: boolean) =>
      run(category, enabled, () =>
        graphqlRequest(MobileSetMailPreferenceDocument, { category, enabled }, { auth: true }).then(
          (data) => data.setMyMailPreference,
        ),
      ),
    [run],
  );

  const setAll = useCallback(
    (enabled: boolean) =>
      run(ALL_CATEGORIES, enabled, () =>
        graphqlRequest(MobileSetAllMailPreferencesDocument, { enabled }, { auth: true }).then(
          (data) => data.setAllMyMailPreferences,
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
    /** The last save was an opt-out, so a confirmation email is on its way. */
    confirmationSent,
    dismissSaved: useCallback(() => setSaved(false), []),
    busyCategory,
    setCategory,
    setAll,
  };
}
