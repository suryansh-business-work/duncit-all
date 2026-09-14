import { useCallback, useEffect, useState } from 'react';
import type { ResultOf, VariablesOf } from '@graphql-typed-document-node/core';

import {
  MobileAccountHealthDocument,
  MobileUpdateProfileDocument,
  MobileUpdateProfileVisibilityDocument,
} from '@/graphql/account';
import { MobileSetUsernameDocument } from '@/graphql/username';
import { ProfileVisibility } from '@/generated/graphql/graphql';
import { graphqlRequest } from '@/services/graphql.client';
import { useMeStore, type MeData } from '@/stores/me.store';
import { useRefreshRegistration } from '@/components/PullToRefresh';

export type AccountMe = NonNullable<MeData['me']>;
export type AccountHealth = ResultOf<typeof MobileAccountHealthDocument>['myAccountHealth'];
export type UpdateProfileInput = VariablesOf<typeof MobileUpdateProfileDocument>['input'];

/**
 * Profile-settings data + mutations — RN twin of mWeb's AccountPage hooks. The
 * full profile record is the user info already in the `me` store, so only the
 * account health is read here. Every profile update re-reads the user info —
 * the one moment it is asked for again — so the header avatar and the drawer
 * follow the edit.
 */
export function useAccount() {
  const me = useMeStore((s) => s.data?.me ?? null);
  const meLoading = useMeStore((s) => s.isLoading);
  const meError = useMeStore((s) => s.error);
  const [health, setHealth] = useState<AccountHealth | null>(null);
  const [healthLoading, setHealthLoading] = useState(true);
  const [healthError, setHealthError] = useState<unknown>();
  const isLoading = (meLoading && !me) || healthLoading;
  const error = meError ?? healthError;

  const load = useCallback(async () => {
    const healthResult = await graphqlRequest(MobileAccountHealthDocument, undefined, {
      auth: true,
    });
    setHealth(healthResult.myAccountHealth ?? null);
  }, []);

  useEffect(() => {
    let active = true;
    load()
      .catch((err) => active && setHealthError(err))
      .finally(() => active && setHealthLoading(false));
    return () => {
      active = false;
    };
  }, [load]);

  useRefreshRegistration(load);

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

  /**
   * Rename the @handle. Its own mutation rather than a field on the profile
   * input: it is the only thing the server can still refuse after the field
   * said yes (somebody can take it in the 400ms between the check and the tap),
   * and it publishes the session, because the handle is in every share link.
   */
  const setUsername = useCallback(
    async (username: string) => {
      await graphqlRequest(MobileSetUsernameDocument, { username }, { auth: true });
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
    setUsername,
    updateProfile,
    updateVisibility,
    refresh,
  };
}
