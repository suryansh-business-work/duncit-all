import { useCallback, useState } from 'react';
import { Linking } from 'react-native';
import { Contact, ContactField, requestPermissionsAsync } from 'expo-contacts';
import {
  contactEntriesFromPhoneBook,
  syncContactsInSlices,
  type ContactSyncStage,
  type PhoneBookPerson,
} from '@duncit/utils';
import { logs } from '@duncit/logs';

import { SyncContactsDocument } from '@/graphql/contacts';
import { graphqlRequest } from '@/services/graphql.client';

/** Why a sync did not happen — mapped to copy by the screen, never shown raw.
 * BLOCKED is a refusal the OS will not ask about again (iOS after the first
 * "Don't Allow"): only the Settings app can turn access back on. */
export type ContactsSyncFailure = 'DENIED' | 'BLOCKED' | 'FAILED';

/** The two fields a sync reads. Everything else in a phone book — addresses,
 * birthdays, notes — is none of Duncit's business and is never asked for. */
const READ_FIELDS = [ContactField.FULL_NAME, ContactField.PHONES] as const;

/** Contacts read off the device per call. Android resolves a page's numbers
 * with one `IN (…)` over its ids, which SQLite caps at 999 values. */
const READ_PAGE = 500;

/**
 * Read the phone book a page at a time, reporting how far along it is — a
 * phone book of thousands read in one call is seconds of a frozen spinner.
 *
 * Reads through expo-contacts' CLASS-BASED API (`Contact.getAllDetails`). The
 * legacy `getContactsAsync` is still exported from the package root in SDK 57
 * but THROWS at runtime, which is what turned an allowed permission into
 * "Your contacts could not be synced" on every device.
 */
async function readPhoneBook(onRead: (stage: ContactSyncStage) => void) {
  const total = await Contact.getCount();
  const people: PhoneBookPerson[] = [];
  onRead({ phase: 'READING', done: 0, total });
  for (let offset = 0; offset < total; offset += READ_PAGE) {
    const page = await Contact.getAllDetails(READ_FIELDS, { limit: READ_PAGE, offset });
    people.push(
      ...page.map((person) => ({
        name: person.fullName ?? '',
        phones: person.phones.map((phone) => phone.number ?? ''),
      })),
    );
    onRead({ phase: 'READING', done: Math.min(offset + page.length, total), total });
    if (page.length < READ_PAGE) break;
  }
  return people;
}

/**
 * Ask for the contacts permission, read the phone book and sync it — both
 * halves reported to the screen as they go, so a big phone book shows a bar
 * that moves rather than a button that spins.
 *
 * Numbers are reduced to their comparable key on the device
 * (`contactEntriesFromPhoneBook`) so the phone book itself never travels — the
 * server keeps only the accounts the keys matched, plus the unmatched keys the
 * invite list is built from. Twin of mWeb's `useContactsSync` (rule 27), which
 * reads through the browser's picker instead.
 */
export function useContactsSync(onSynced: () => Promise<unknown>) {
  const [stage, setStage] = useState<ContactSyncStage | null>(null);
  const [failure, setFailure] = useState<ContactsSyncFailure | null>(null);

  const sync = useCallback(async () => {
    setFailure(null);
    setStage({ phase: 'READING', done: 0, total: 0 });
    try {
      const permission = await requestPermissionsAsync();
      if (!permission.granted) {
        setFailure(permission.canAskAgain ? 'DENIED' : 'BLOCKED');
        return;
      }
      const entries = contactEntriesFromPhoneBook(await readPhoneBook(setStage));
      await syncContactsInSlices({
        entries,
        send: async (slice, batch) => {
          const data = await graphqlRequest(
            SyncContactsDocument,
            { entries: slice, batch },
            { auth: true },
          );
          return data.syncContacts;
        },
        onProgress: setStage,
      });
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
      setStage(null);
    }
  }, [onSynced]);

  // The phone book holds OTHER people's names and numbers, so the person is
  // told exactly what is read and kept before anything is (GDPR). `request`
  // only asks; nothing is read until they agree, and "Not now" does nothing.
  const [asking, setAsking] = useState(false);
  const request = useCallback(() => {
    if (failure !== 'BLOCKED') {
      setAsking(true);
      return;
    }
    // The OS would answer "denied" without showing a prompt, so the button
    // sends the person to Settings instead. The failure is cleared so the
    // next tap, once they are back, asks the OS afresh.
    setFailure(null);
    Linking.openSettings().catch((error) =>
      logs.mobileApp.error('useContactsSync', 'openSettings', { error }),
    );
  }, [failure]);
  const decline = useCallback(() => setAsking(false), []);
  const agree = useCallback(() => {
    setAsking(false);
    return sync();
  }, [sync]);

  return { supported: true, request, asking, agree, decline, busy: stage !== null, stage, failure };
}
