import { useCallback, useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { notifyError, notifySuccess } from '../../components/notify';
import { useTranslation } from '../../i18n/useTranslation';
import { parseApiError } from '../../utils/parseApiError';
import { CLEAR_MY_CONTACTS } from './queries';

/**
 * "Remove synced contacts": the confirm dialog's state and the press behind
 * it. The dialog stays up, with Confirm spinning, until the server has dropped
 * the phone book — then it closes and the lists re-read behind it. Twin of
 * native `useClearContacts` (rule 27).
 */
export function useClearContacts(onCleared: () => Promise<unknown>) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [clearContacts, { loading }] = useMutation<any>(CLEAR_MY_CONTACTS);

  const confirm = useCallback(async () => {
    try {
      await clearContacts();
      setOpen(false);
      notifySuccess(t('mweb.contacts.cleared'));
      await onCleared();
    } catch (error) {
      notifyError(parseApiError(error));
    }
  }, [clearContacts, onCleared, t]);

  return { open, setOpen, busy: loading, confirm };
}
