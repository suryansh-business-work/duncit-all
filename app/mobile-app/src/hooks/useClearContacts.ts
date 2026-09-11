import { useCallback, useState } from 'react';

import { ClearMyContactsDocument } from '@/graphql/contacts';
import { graphqlRequest } from '@/services/graphql.client';

/**
 * "Remove synced contacts": the confirm dialog's state and the press behind it.
 *
 * The dialog stays up, with Confirm spinning, until the server has actually
 * dropped the phone book — then it closes and the lists re-read behind it,
 * which is the order mWeb's ContactsPage uses (rule 27).
 */
export function useClearContacts(onCleared: () => Promise<unknown>) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const confirm = useCallback(async () => {
    setBusy(true);
    try {
      await graphqlRequest(ClearMyContactsDocument, undefined, { auth: true }).catch(
        () => undefined,
      );
    } finally {
      setBusy(false);
      setOpen(false);
    }
    await onCleared();
  }, [onCleared]);

  return { open, setOpen, busy, confirm };
}
