import { useCallback, useEffect, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';

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
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
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

  const run = useCallback(
    async (key: string, work: () => Promise<MailPreference>) => {
      if (busyCategory !== null) return;
      setBusyCategory(key);
      setError(null);
      try {
        setPreference(await work());
        setSaved(true);
      } catch (e) {
        setError(e instanceof Error ? e.message : null);
      } finally {
        setBusyCategory(null);
      }
    },
    [busyCategory],
  );

  const setCategory = useCallback(
    (category: string, enabled: boolean) =>
      run(category, () =>
        graphqlRequest(MobileSetMailPreferenceDocument, { category, enabled }, { auth: true }).then(
          (data) => data.setMyMailPreference,
        ),
      ),
    [run],
  );

  const setAll = useCallback(
    (enabled: boolean) =>
      run(ALL_CATEGORIES, () =>
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
    error,
    saved,
    dismissSaved: useCallback(() => setSaved(false), []),
    busyCategory,
    setCategory,
    setAll,
  };
}
