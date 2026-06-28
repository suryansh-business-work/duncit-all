import { useCallback, useEffect, useState } from 'react';
import type { ResultOf, VariablesOf } from '@graphql-typed-document-node/core';

import {
  MobileAccountDocument,
  MobileAccountHealthDocument,
  MobileUpdateProfileDocument,
  MobileUpdateProfileVisibilityDocument,
} from '@/graphql/account';
import { ProfileVisibility } from '@/generated/graphql/graphql';
import { graphqlRequest } from '@/services/graphql.client';
import { useMeStore } from '@/stores/me.store';

export type AccountData = ResultOf<typeof MobileAccountDocument>;
export type AccountMe = NonNullable<AccountData['me']>;
export type AccountHealth = ResultOf<typeof MobileAccountHealthDocument>['myAccountHealth'];
export type UpdateProfileInput = VariablesOf<typeof MobileUpdateProfileDocument>['input'];

/**
 * Profile-settings data + mutations — RN twin of mWeb's AccountPage hooks. Loads
 * the full `me` record and account health, and exposes profile updates that
 * refresh both this screen and the shared `me` store (so the header avatar syncs).
 */
export function useAccount() {
  const [me, setMe] = useState<AccountMe | null>(null);
  const [health, setHealth] = useState<AccountHealth | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>();

  const load = useCallback(async () => {
    const [account, healthResult] = await Promise.all([
      graphqlRequest(MobileAccountDocument, undefined, { auth: true }),
      graphqlRequest(MobileAccountHealthDocument, undefined, { auth: true }),
    ]);
    setMe(account.me ?? null);
    setHealth(healthResult.myAccountHealth ?? null);
  }, []);

  useEffect(() => {
    let active = true;
    load()
      .catch((err) => active && setError(err))
      .finally(() => active && setIsLoading(false));
    return () => {
      active = false;
    };
  }, [load]);

  const refresh = useCallback(async () => {
    await load();
    await useMeStore.getState().refetch();
  }, [load]);

  const updateProfile = useCallback(
    async (input: UpdateProfileInput) => {
      await graphqlRequest(MobileUpdateProfileDocument, { input }, { auth: true });
      await refresh();
    },
    [refresh],
  );

  const updateVisibility = useCallback(
    async (isPrivate: boolean) => {
      await graphqlRequest(
        MobileUpdateProfileVisibilityDocument,
        { visibility: isPrivate ? ProfileVisibility.Private : ProfileVisibility.Public },
        { auth: true },
      );
      await refresh();
    },
    [refresh],
  );

  return {
    me,
    health,
    isLoading,
    error,
    updateProfile,
    updateVisibility,
    refresh,
  };
}
