import { useCallback, useState } from 'react';
import { useApolloClient, useMutation } from '@apollo/client/react';
import {
  inviteOutcomeKey,
  markInvited,
  toggleInviteKey,
  type ContactsPage,
  type InvitableContact,
} from '@duncit/utils';
import { notifyError, notifySuccess } from '../../components/notify';
import { useTranslation } from '../../i18n/useTranslation';
import { parseApiError } from '../../utils/parseApiError';
import { CONTACTS_TO_INVITE_PAGE, INVITE_CONTACTS } from './queries';
import { useContactPages } from './useContactPages';

/** What one press reported back. */
interface InviteResult {
  requested: number;
  sent: number;
  skipped: number;
  failed: number;
  sent_keys: string[];
}

/**
 * The invite tab's state: every number still to be asked, streamed in page by
 * page while the tab is open, which of them are ticked, and the two presses
 * that text them — one row, or the ticked ones. A press marks the numbers that
 * went (`sent_keys`) rather than re-reading the phone book. Twin of native
 * `useContactsInvite` (rule 27).
 */
export function useContactsInvite(active: boolean) {
  const { t } = useTranslation();
  const client = useApolloClient();
  const [selected, setSelected] = useState<string[]>([]);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [inviteContacts] = useMutation<any>(INVITE_CONTACTS);

  const fetchPage = useCallback(
    async (offset: number, limit: number): Promise<ContactsPage<InvitableContact>> => {
      const { data } = await client.query<any>({
        query: CONTACTS_TO_INVITE_PAGE,
        variables: { offset, limit },
        fetchPolicy: 'no-cache',
      });
      return data.contactsToInvitePage;
    },
    [client]
  );
  const pages = useContactPages(fetchPage, active);
  const { patch } = pages;

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
    async (keys: string[]) => {
      try {
        const { data } = await inviteContacts({ variables: { phone_keys: keys } });
        const result: InviteResult = data.inviteContacts;
        report(result);
        setSelected([]);
        patch((rows) => markInvited(rows, result.sent_keys, new Date().toISOString()));
      } catch (error) {
        notifyError(parseApiError(error));
      }
    },
    [inviteContacts, patch, report]
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
    [run]
  );

  const inviteSelected = useCallback(async () => {
    setBulkBusy(true);
    try {
      await run(selected);
    } finally {
      setBulkBusy(false);
    }
  }, [run, selected]);

  return { ...pages, selected, busyKey, bulkBusy, toggleSelect, inviteRow, inviteSelected };
}
