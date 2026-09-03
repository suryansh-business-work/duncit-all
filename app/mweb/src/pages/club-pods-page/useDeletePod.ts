import { useState } from 'react';
import { useMutation } from '@apollo/client/react';
import { CLUB_ADMIN_DELETE_POD } from '@duncit/pod-form';
import { parseApiError } from '@duncit/utils';
import { notifyError, notifySuccess } from '../../components/notify';
import { useTranslation } from '../../i18n/useTranslation';
import type { ClubAdminPodRow } from './types';

/**
 * The delete flow behind a pod row: ask, confirm, then tell the list to
 * reload. The confirmation itself is the app's ConfirmDialog — a soft-delete
 * that pulls a pod from its members is never one tap.
 */
export function useDeletePod(onDeleted: () => void) {
  const { t } = useTranslation();
  const [target, setTarget] = useState<ClubAdminPodRow | null>(null);
  const [deletePod, { loading }] = useMutation<any>(CLUB_ADMIN_DELETE_POD);

  const confirm = async () => {
    if (!target) return;
    try {
      await deletePod({ variables: { pod_doc_id: target.id } });
      notifySuccess(t('clubAdmin.pods.podDeleted'));
      onDeleted();
    } catch (caught) {
      notifyError(parseApiError(caught));
    } finally {
      setTarget(null);
    }
  };

  return {
    target,
    busy: loading,
    ask: setTarget,
    cancel: () => setTarget(null),
    confirm: () => {
      confirm().catch(() => undefined);
    },
  };
}
