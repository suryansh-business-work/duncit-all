import { useEffect, useMemo } from 'react';

import { useMeStore } from '@/stores/me.store';
import { useRolesStore } from '@/stores/roles.store';

/** Current signed-in user for the account drawer (auth required). */
export function useMe() {
  const data = useMeStore((s) => s.data);
  const isLoading = useMeStore((s) => s.isLoading);
  const error = useMeStore((s) => s.error);
  const fetch = useMeStore((s) => s.fetch);

  useEffect(() => {
    void fetch();
  }, [fetch]);

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
    void fetch();
  }, [fetch]);

  const map = useMemo(() => {
    const m = new Map<string, string>();
    (data?.publicRoles ?? []).forEach((r) => m.set(r.key, r.name));
    return m;
  }, [data]);

  return { labelFor: (key: string) => map.get(key) ?? fallbackLabel(key) };
}
