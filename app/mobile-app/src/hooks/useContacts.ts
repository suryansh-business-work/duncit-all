import { useCallback, useEffect, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';
import { withFollowStatus, type FollowStatus } from '@duncit/utils';

import { ContactsOnDuncitPageDocument, MyContactsSyncDocument } from '@/graphql/contacts';
import { useContactPages } from '@/hooks/useContactPages';
import { graphqlRequest } from '@/services/graphql.client';
import { useRefreshRegistration } from '@/components/PullToRefresh';

type MatchesPage = ResultOf<typeof ContactsOnDuncitPageDocument>['contactsOnDuncitPage'];
export type ContactRow = MatchesPage['rows'][number];
type SyncData = ResultOf<typeof MyContactsSyncDocument>;
export type ContactsSyncStatus = NonNullable<SyncData['myContactsSync']>;
export type ContactsViewer = NonNullable<SyncData['me']>;

export type ContactsScope = 'all' | 'nearby' | 'invite';

const fetchMatches = async (offset: number, limit: number): Promise<MatchesPage> => {
  const data = await graphqlRequest(
    ContactsOnDuncitPageDocument,
    { offset, limit },
    { auth: true },
  );
  return data.contactsOnDuncitPage;
};

/**
 * Every matched contact, streamed in page by page. The scope and the search
 * run on the device over what has landed, so switching tabs or typing never
 * waits on a round trip — and a follow patches its one row instead of
 * re-reading the list. Twin of mWeb's `useContactsList` (rule 27).
 */
export function useContactsOnDuncit() {
  const pages = useContactPages(fetchMatches);
  const { patch } = pages;
  const setFollowStatus = useCallback(
    (userId: string, status: FollowStatus) =>
      patch((rows) => withFollowStatus(rows, userId, status)),
    [patch],
  );
  return { ...pages, setFollowStatus };
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
