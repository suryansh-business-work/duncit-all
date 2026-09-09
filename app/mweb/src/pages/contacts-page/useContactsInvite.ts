import { useCallback, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { inviteOutcomeKey, toggleInviteKey, type InvitableContact } from '@duncit/utils';
import { notifyError, notifySuccess } from '../../components/notify';
import { useTranslation } from '../../i18n/useTranslation';
import { parseApiError } from '../../utils/parseApiError';
import { CONTACTS_TO_INVITE, INVITE_CONTACTS } from './queries';

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
 * press it. Twin of native `useContactsInvite` (rule 27).
 */
export function useContactsInvite(search: string, active: boolean) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<string[]>([]);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);

  const query = useQuery<any>(CONTACTS_TO_INVITE, {
    variables: { search: search || null },
    skip: !active,
    fetchPolicy: 'cache-and-network',
  });
  const [inviteContacts] = useMutation<any>(INVITE_CONTACTS);

  const toggleSelect = useCallback(
    (key: string) => setSelected((current) => toggleInviteKey(current, key)),
    []
  );

  const report = useCallback(
    (result: InviteResult) => {
      const key = inviteOutcomeKey(result);
      if (result.sent > 0) {
        notifySuccess(t(key, { count: result.sent }));
        return;
      }
      // Nothing went: either the platform held them back (WhatsApp switched
      // off, already invited) or AiSensy refused. Both are worth saying out
      // loud — a silent button reads as a broken one.
      notifyError(t(key));
    },
    [t]
  );

  const invite = useCallback(
    async (keys: string[]) => {
      // A one-key press is a row's own button; everything else is a bulk press.
      const single = keys.length === 1 ? (keys[0] ?? null) : null;
      setBusyKey(single);
      setBulkBusy(single === null);
      try {
        const { data } = await inviteContacts({ variables: { phone_keys: keys } });
        report(data.inviteContacts);
        setSelected([]);
        await query.refetch();
      } catch (error) {
        notifyError(parseApiError(error));
      } finally {
        setBusyKey(null);
        setBulkBusy(false);
      }
    },
    [inviteContacts, query, report]
  );

  const rows: InvitableContact[] = query.data?.contactsToInvite ?? [];
  return {
    rows,
    loading: query.loading,
    hasData: Boolean(query.data),
    error: query.error?.message,
    selected,
    busyKey,
    bulkBusy,
    toggleSelect,
    invite,
    refetch: query.refetch,
  };
}
