import { useCallback, useState } from 'react';
import * as Contacts from 'expo-contacts';
import { contactEntriesFromPhoneBook } from '@duncit/utils';

import { SyncContactsDocument } from '@/graphql/contacts';
import { graphqlRequest } from '@/services/graphql.client';

/** Why a sync did not happen — mapped to copy by the screen, never shown raw. */
export type ContactsSyncFailure = 'DENIED' | 'FAILED';

/**
 * Ask for the contacts permission, read the phone book and sync it.
 *
 * Numbers are reduced to their comparable key on the device
 * (`contactEntriesFromPhoneBook`) so the phone book itself never travels — the
 * server keeps only the accounts the keys matched. Twin of mWeb's
 * `useContactsSync` (rule 27), which reads through the browser's picker instead.
 */
export function useContactsSync(onSynced: () => Promise<unknown>) {
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<ContactsSyncFailure | null>(null);

  const request = useCallback(async () => {
    setFailure(null);
    setBusy(true);
    try {
      const permission = await Contacts.requestPermissionsAsync();
      if (permission.status !== 'granted') {
        setFailure('DENIED');
        return;
      }
      const { data } = await Contacts.getContactsAsync({
        fields: [Contacts.Fields.Name, Contacts.Fields.PhoneNumbers],
      });
      const entries = contactEntriesFromPhoneBook(
        data.map((contact) => ({
          name: contact.name ?? '',
          phones: (contact.phoneNumbers ?? []).map((phone) => phone.number),
        })),
      );
      await graphqlRequest(SyncContactsDocument, { entries }, { auth: true });
      await onSynced();
    } catch {
      setFailure('FAILED');
    } finally {
      setBusy(false);
    }
  }, [onSynced]);

  return { supported: true, request, busy, failure };
}
