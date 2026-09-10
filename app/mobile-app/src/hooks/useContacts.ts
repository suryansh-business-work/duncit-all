import { useCallback, useEffect, useRef, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';

import { ContactsOnDuncitDocument, MyContactsSyncDocument } from '@/graphql/contacts';
import { graphqlRequest } from '@/services/graphql.client';
import { useRefreshRegistration } from '@/components/PullToRefresh';

export type ContactRow = ResultOf<typeof ContactsOnDuncitDocument>['contactsOnDuncit'][number];
type SyncData = ResultOf<typeof MyContactsSyncDocument>;
export type ContactsSyncStatus = NonNullable<SyncData['myContactsSync']>;
export type ContactsViewer = NonNullable<SyncData['me']>;

const DEBOUNCE_MS = 350;

export type ContactsScope = 'all' | 'nearby' | 'invite';

/**
 * The viewer's matched contacts, filtered by the server: a debounced name
 * search and the same-city switch. Request sequencing drops a stale answer
 * when the filters change mid-flight (the useSavedPods pattern).
 */
export function useContactsOnDuncit(search: string, scope: ContactsScope) {
  const [rows, setRows] = useState<ContactRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>();
  const seq = useRef(0);
  const trimmed = search.trim();
  const nearby = scope === 'nearby';

  const load = useCallback(async () => {
    const requestId = ++seq.current;
    try {
      const data = await graphqlRequest(
        ContactsOnDuncitDocument,
        { search: trimmed || null, nearby },
        { auth: true },
      );
      if (seq.current !== requestId) return;
      setRows(data.contactsOnDuncit);
      setError(undefined);
    } catch (err) {
      if (seq.current !== requestId) return;
      setError(err);
    } finally {
      if (seq.current === requestId) setIsLoading(false);
    }
  }, [trimmed, nearby]);

  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => {
      load().catch(() => undefined);
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [load]);

  useRefreshRegistration(load);

  return { rows, isLoading, error, refetch: load };
}

/** Whether the viewer has synced, and the viewer for the radar's centre. */
export function useContactsSyncStatus() {
  const [status, setStatus] = useState<ContactsSyncStatus | null>(null);
  const [viewer, setViewer] = useState<ContactsViewer | null>(null);

  const load = useCallback(async () => {
    const data = await graphqlRequest(MyContactsSyncDocument, undefined, { auth: true });
    setStatus(data.myContactsSync ?? null);
    setViewer(data.me ?? null);
  }, []);

  useEffect(() => {
    load().catch(() => undefined);
  }, [load]);

  useRefreshRegistration(load);

  return { status, viewer, refetch: load };
}
