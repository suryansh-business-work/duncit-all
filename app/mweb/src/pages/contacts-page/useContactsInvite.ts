import { useCallback, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import {
  inviteOutcomeKey,
  toggleInviteKey,
  type InvitableContact,
  type InviteBulkPress,
} from '@duncit/utils';
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
 * ticked, which is the same contract the mutation states. Twin of native
 * `useContactsInvite` (rule 27).
 */
export function useContactsInvite(search: string, active: boolean) {
  const { t } = useTranslation();
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState<Busy>(IDLE);

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
      // off, already invited, the day's ceiling reached) or AiSensy refused.
      // Both are worth saying out loud — a silent button reads as a broken one.
      notifyError(t(key));
    },
    [t]
  );

  const run = useCallback(
    async (keys: string[], pressed: Busy) => {
      setBusy(pressed);
      try {
        const { data } = await inviteContacts({ variables: { phone_keys: keys } });
        report(data.inviteContacts);
        setSelected([]);
        await query.refetch();
      } catch (error) {
        notifyError(parseApiError(error));
      } finally {
        setBusy(IDLE);
      }
    },
    [inviteContacts, query, report]
  );

  const inviteRow = useCallback((key: string) => run([key], { key, bulk: null }), [run]);
  const inviteSelected = useCallback(
    () => run(selected, { key: null, bulk: 'SELECTED' }),
    [run, selected]
  );
  // An empty list is the mutation's word for "everyone still waiting" — the
  // page never has to enumerate a phone book to press this.
  const inviteAll = useCallback(() => run([], { key: null, bulk: 'ALL' }), [run]);

  const rows: InvitableContact[] = query.data?.contactsToInvite ?? [];
  return {
    rows,
    loading: query.loading,
    hasData: Boolean(query.data),
    error: query.error?.message,
    selected,
    busyKey: busy.key,
    bulkBusy: busy.bulk,
    toggleSelect,
    inviteRow,
    inviteSelected,
    inviteAll,
    refetch: query.refetch,
  };
}
