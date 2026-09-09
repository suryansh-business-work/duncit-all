import { useCallback, useEffect, useRef, useState } from 'react';
import { toggleInviteKey, type InvitableContact } from '@duncit/utils';

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

/**
 * The invite tab's state: who is still to be asked, which of them are ticked,
 * and the one call that texts a row, the ticked ones or everyone waiting.
 *
 * An empty key list means "everyone still waiting" — the same contract the
 * mutation states, so the button does not have to enumerate a phone book to
 * press it. Request sequencing drops a stale answer when the search changes
 * mid-flight, exactly as `useContactsOnDuncit` does. Twin of mWeb's
 * `useContactsInvite` (rule 27).
 */
export function useContactsInvite(search: string, active: boolean) {
  const [rows, setRows] = useState<InvitableContact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<unknown>();
  const [selected, setSelected] = useState<string[]>([]);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
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

  const invite = useCallback(
    async (keys: string[]) => {
      // A one-key press is a row's own button; everything else is a bulk press.
      const single = keys.length === 1 ? (keys[0] ?? null) : null;
      setBusyKey(single);
      setBulkBusy(single === null);
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
        setBusyKey(null);
        setBulkBusy(false);
      }
    },
    [load],
  );

  return {
    rows,
    isLoading,
    error,
    selected,
    busyKey,
    bulkBusy,
    result,
    toggleSelect,
    invite,
    refetch: load,
  };
}
