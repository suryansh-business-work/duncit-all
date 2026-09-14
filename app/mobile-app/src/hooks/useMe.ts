import { useEffect, useMemo } from 'react';

import { useAuthStore } from '@/stores/auth.store';
import { useMeStore } from '@/stores/me.store';
import { useRolesStore } from '@/stores/roles.store';
import { useRefreshRegistration } from '@/components/PullToRefresh';

/**
 * Current signed-in user, read from the user-info store.
 *
 * `useUserInfoSession` loads it when the session starts; a mount here only
 * joins that request or reads the answer, so the header, the feed and the
 * drawer never ask again. Signed out there is nothing to ask for. A pull to
 * refresh re-reads it — one request however many readers the screen has.
 */
export function useMe() {
  const data = useMeStore((s) => s.data);
  const isLoading = useMeStore((s) => s.isLoading);
  const error = useMeStore((s) => s.error);
  const fetch = useMeStore((s) => s.fetch);
  const refetch = useMeStore((s) => s.refetch);
  const signedIn = useAuthStore((s) => !!s.token);

  useEffect(() => {
    if (signedIn) fetch();
  }, [fetch, signedIn]);

  useRefreshRegistration(refetch);

  return { data, isLoading, error };
}

const fallbackLabel = (key: string) =>
  key
    .toLowerCase()
    .split('_')
    .map((w) => (w ? w.charAt(0).toUpperCase() + w.slice(1) : ''))
    .join(' ');

/**
 * Role key → human label, sourced from the server's `publicRoles`. Falls back
 * to a title-cased key while loading or for unknown keys.
 */
export function useRoleLabels() {
  const data = useRolesStore((s) => s.data);
  const fetch = useRolesStore((s) => s.fetch);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const map = useMemo(() => {
    const m = new Map<string, string>();
    (data?.publicRoles ?? []).forEach((r) => m.set(r.key, r.name));
    return m;
  }, [data]);

  return { labelFor: (key: string) => map.get(key) ?? fallbackLabel(key) };
}
