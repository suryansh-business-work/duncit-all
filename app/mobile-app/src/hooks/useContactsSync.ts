import { useCallback, useState } from 'react';
import { Contact, ContactField, requestPermissionsAsync } from 'expo-contacts';
import { contactEntriesFromPhoneBook } from '@duncit/utils';
import { logs } from '@duncit/logs';

import { SyncContactsDocument } from '@/graphql/contacts';
import { graphqlRequest } from '@/services/graphql.client';

/** Why a sync did not happen â mapped to copy by the screen, never shown raw. */
export type ContactsSyncFailure = 'DENIED' | 'FAILED';

/** The two fields a sync reads. Everything else in a phone book â addresses,
 * birthdays, notes â is none of Duncit's business and is never asked for. */
const READ_FIELDS = [ContactField.FULL_NAME, ContactField.PHONES] as const;

/**
 * Ask for the contacts permission, read the phone book and sync it.
 *
 * Reads through expo-contacts' CLASS-BASED API (`Contact.getAllDetails`). The
 * legacy `getContactsAsync` is still exported from the package root in SDK 57
 * but THROWS at runtime, which is what turned an allowed permission into
 * "Your contacts could not be synced" on every device.
 *
 * Numbers are reduced to their comparable key on the device
 * (`contactEntriesFromPhoneBook`) so the phone book itself never travels â the
 * server keeps only the accounts the keys matched, plus the unmatched keys the
 * invite list is built from. Twin of mWeb's `useContactsSync` (rule 27), which
 * reads through the browser's picker instead.
 */
export function useContactsSync(onSynced: () => Promise<unknown>) {
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<ContactsSyncFailure | null>(null);

  const request = useCallback(async () => {
    setFailure(null);
    setBusy(true);
    try {
      const permission = await requestPermissionsAsync();
      if (!permission.granted) {
        setFailure('DENIED');
        return;
      }
      const people = await Contact.getAllDetails(READ_FIELDS);
      const entries = contactEntriesFromPhoneBook(
        people.map((person) => ({
          name: person.fullName ?? '',
          phones: person.phones.map((phone) => phone.number ?? ''),
        })),
      );
      await graphqlRequest(SyncContactsDocument, { entries }, { auth: true });
      // The sync is the write; refreshing the screen is a read of what it
      // wrote. A read that fails is not a sync that failed — it is logged, and
      // the phone book stays synced rather than being reported as lost.
      await onSynced().catch((error) =>
        logs.mobileApp.error('useContactsSync', 'refresh', { error }),
      );
    } catch (error) {
      logs.mobileApp.error('useContactsSync', 'request', { error });
      setFailure('FAILED');
    } finally {
      setBusy(false);
    }
  }, [onSynced]);

  return { supported: true, request, busy, failure };
}
