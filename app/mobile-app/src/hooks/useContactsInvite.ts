import { useCallback, useEffect, useRef, useState } from 'react';
import { toggleInviteKey, type InvitableContact, type InviteBulkPress } from '@duncit/utils';

import { ContactsToInviteDocument, InviteContactsDocument } from '@/graphql/contacts';
import { graphqlRequest } from '@/services/graphql.client';

const DEBOUNCE_MS = 350;

/** What one press reported back. */
interface InviteResult {
  requested: number;
  sent: number;
  skipped: number;
  failed: number;
}

/** Which control is mid-flight: one row's button, or one of the two bulk ones. */
interface Busy {
  key: string | null;
  bulk: InviteBulkPress | null;
}

const IDLE: Busy = { key: null, bulk: null };

/**
 * The invite tab's state: who is still to be asked, which of them are ticked,
 * and the three presses that text them — one row, the ticked ones, or everyone
 * still waiting.
 *
 * Each press says which control it came from rather than letting the spinner
 * infer it from the key list: "Invite all" sends an empty list whatever is
 * ticked, which is the same contract the mutation states. Request sequencing
 * drops a stale answer when the search changes mid-flight, exactly as
 * `useContactsOnDuncit` does. Twin of mWeb's `useContactsInvite` (rule 27).
 */
export function useContactsInvite(search: string, active: boolean) {
  const [rows, setRows] = useState<InvitableContact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>();
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState<Busy>(IDLE);
  const [result, setResult] = useState<InviteResult | null>(null);
  const seq = useRef(0);
  const trimmed = search.trim();

  const load = useCallback(async () => {
    const requestId = ++seq.current;
    try {
      const data = await graphqlRequest(
        ContactsToInviteDocument,
        { search: trimmed || null },
        { auth: true },
      );
      if (seq.current !== requestId) return;
      setRows(data.contactsToInvite);
      setError(undefined);
    } catch (err) {
      if (seq.current !== requestId) return;
      setError(err);
    } finally {
      if (seq.current === requestId) setIsLoading(false);
    }
  }, [trimmed]);

  useEffect(() => {
    if (!active) return undefined;
    setIsLoading(true);
    const timer = setTimeout(() => {
      load().catch(() => undefined);
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [active, load]);

  const toggleSelect = useCallback(
    (key: string) => setSelected((current) => toggleInviteKey(current, key)),
    [],
  );

  const run = useCallback(
    async (keys: string[], pressed: Busy) => {
      setBusy(pressed);
      setResult(null);
      try {
        const data = await graphqlRequest(
          InviteContactsDocument,
          { phone_keys: keys },
          { auth: true },
        );
        setResult(data.inviteContacts);
        setSelected([]);
        setError(undefined);
        await load();
      } catch (err) {
        setError(err);
      } finally {
        setBusy(IDLE);
      }
    },
    [load],
  );

  const inviteRow = useCallback((key: string) => run([key], { key, bulk: null }), [run]);
  const inviteSelected = useCallback(
    () => run(selected, { key: null, bulk: 'SELECTED' }),
    [run, selected],
  );
  // An empty list is the mutation's word for "everyone still waiting" — the
  // screen never has to enumerate a phone book to press this.
  const inviteAll = useCallback(() => run([], { key: null, bulk: 'ALL' }), [run]);

  return {
    rows,
    isLoading,
    error,
    selected,
    busyKey: busy.key,
    bulkBusy: busy.bulk,
    result,
    toggleSelect,
    inviteRow,
    inviteSelected,
    inviteAll,
    refetch: load,
  };
}
