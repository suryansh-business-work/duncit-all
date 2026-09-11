import { useCallback, useState } from 'react';
import type { ResultOf } from '@graphql-typed-document-node/core';
import { markInvited, toggleInviteKey, type InvitableContact } from '@duncit/utils';

import { ContactsToInvitePageDocument, InviteContactsDocument } from '@/graphql/contacts';
import { useContactPages } from '@/hooks/useContactPages';
import { graphqlRequest } from '@/services/graphql.client';

/** What one press reported back. */
export type InviteResult = ResultOf<typeof InviteContactsDocument>['inviteContacts'];

const fetchInvitable = async (offset: number, limit: number) => {
  const data = await graphqlRequest(
    ContactsToInvitePageDocument,
    { offset, limit },
    { auth: true },
  );
  return data.contactsToInvitePage;
};

/**
 * The invite tab's state: every number still to be asked, streamed in page by
 * page while the tab is open, which of them are ticked, and the two presses
 * that text them — one row, or the ticked ones. A press marks the numbers that
 * went (`sent_keys`) rather than re-reading the phone book. Twin of mWeb's
 * `useContactsInvite` (rule 27).
 */
export function useContactsInvite(active: boolean) {
  const pages = useContactPages<InvitableContact>(fetchInvitable, active);
  const { patch } = pages;
  const [selected, setSelected] = useState<string[]>([]);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [result, setResult] = useState<InviteResult | null>(null);
  const [inviteError, setInviteError] = useState<unknown>();

  const toggleSelect = useCallback(
    (key: string) => setSelected((current) => toggleInviteKey(current, key)),
    [],
  );

  const run = useCallback(
    async (keys: string[]) => {
      setResult(null);
      setInviteError(undefined);
      try {
        const data = await graphqlRequest(
          InviteContactsDocument,
          { phone_keys: keys },
          { auth: true },
        );
        const outcome = data.inviteContacts;
        setResult(outcome);
        setSelected([]);
        patch((rows) => markInvited(rows, outcome.sent_keys, new Date().toISOString()));
      } catch (err) {
        setInviteError(err);
      }
    },
    [patch],
  );

  const inviteRow = useCallback(
    async (key: string) => {
      setBusyKey(key);
      try {
        await run([key]);
      } finally {
        setBusyKey(null);
      }
    },
    [run],
  );

  const inviteSelected = useCallback(async () => {
    setBulkBusy(true);
    try {
      await run(selected);
    } finally {
      setBulkBusy(false);
    }
  }, [run, selected]);

  return {
    ...pages,
    selected,
    busyKey,
    bulkBusy,
    result,
    inviteError,
    toggleSelect,
    inviteRow,
    inviteSelected,
  };
}
