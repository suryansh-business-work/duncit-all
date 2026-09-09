import { useCallback, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { contactEntriesFromPhoneBook } from '@duncit/utils';
import { logs } from '@duncit/logs';
import { SYNC_CONTACTS } from './queries';

/** Why a sync did not happen — mapped to copy by the page, never shown raw. */
export type ContactsSyncFailure = 'DENIED' | 'FAILED';

/** The Contact Picker API's shape, which the DOM lib does not declare yet. */
interface PickedContact {
  name?: string[];
  tel?: string[];
}
interface ContactsManager {
  select: (
    properties: readonly string[],
    options?: { multiple?: boolean }
  ) => Promise<PickedContact[]>;
}

const contactsManager = (): ContactsManager | null => {
  if (globalThis.navigator === undefined) return null;
  const manager = (globalThis.navigator as Navigator & { contacts?: ContactsManager }).contacts;
  return manager && typeof manager.select === 'function' ? manager : null;
};

/**
 * Read the phone book through the browser's Contact Picker and sync it.
 *
 * The picker is the only door a browser offers, and only some browsers offer
 * it; `supported` tells the page whether to show the button or point at the
 * app. Numbers are reduced to their comparable key on the device
 * (`contactEntriesFromPhoneBook`) so the phone book itself never travels.
 * Twin of native `useContactsSync` (rule 27).
 */
export function useContactsSync(onSynced: () => Promise<unknown>) {
  const [syncContacts, { loading }] = useMutation<any>(SYNC_CONTACTS);
  const [failure, setFailure] = useState<ContactsSyncFailure | null>(null);
  const supported = contactsManager() !== null;

  const request = useCallback(async () => {
    const manager = contactsManager();
    if (!manager) return;
    setFailure(null);
    try {
      const picked = await manager.select(['name', 'tel'], { multiple: true });
      // Closing the picker without choosing is not a refusal, just nothing to do.
      if (picked.length === 0) return;
      const entries = contactEntriesFromPhoneBook(
        picked.map((contact) => ({ name: contact.name?.[0] ?? '', phones: contact.tel ?? [] }))
      );
      await syncContacts({ variables: { entries } });
      // The sync is the write; refreshing the page is a read of what it wrote.
      // A read that fails is not a sync that failed — it is logged, and the
      // phone book stays synced rather than being reported as lost.
      await onSynced().catch((error) => logs.mWeb.error('useContactsSync', 'refresh', { error }));
    } catch (error) {
      const name = (error as { name?: string } | null)?.name;
      const denied = name === 'SecurityError' || name === 'NotAllowedError';
      // A refusal is the person answering the picker, not a fault to log.
      if (!denied) logs.mWeb.error('useContactsSync', 'request', { error });
      setFailure(denied ? 'DENIED' : 'FAILED');
    }
  }, [onSynced, syncContacts]);

  return { supported, request, busy: loading, failure };
}
