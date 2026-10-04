import { useMutation } from '@apollo/client/react';
import type { MutationWithdrawCatalogDeletionArgs } from '@duncit/gql-types';
import { ConfirmDialog, notifyError, notifySuccess } from '@duncit/dialogs';
import { fireAndForget, logs } from '@duncit/logs';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/shell';
import { WITHDRAW_CATALOG_DELETION, type DeletionRequestRow } from './deletion.queries';

export interface WithdrawTarget {
  request: DeletionRequestRow;
  name: string;
}

interface Props {
  target: WithdrawTarget | null;
  onClose: () => void;
  onDone: () => void;
}

/** Withdraw an open deletion request — the item goes back on sale. */
export default function WithdrawDeletionDialog({ target, onClose, onDone }: Readonly<Props>) {
  const { t } = useTranslation();
  const [withdraw, state] = useMutation<{ withdrawCatalogDeletion: DeletionRequestRow }, MutationWithdrawCatalogDeletionArgs>(
    WITHDRAW_CATALOG_DELETION,
  );

  const confirm = async () => {
    if (!target) return;
    try {
      await withdraw({ variables: { id: target.request.id } });
      notifySuccess(t('partners.deletionRequest.withdrawn', { vars: { name: target.name } }));
      onDone();
    } catch (error) {
      notifyError(parseApiError(error));
    }
    onClose();
  };

  return (
    <ConfirmDialog
      open={Boolean(target)}
      title={t('partners.deletionRequest.withdrawTitle')}
      message={t('partners.deletionRequest.withdrawBody', { vars: { name: target?.name ?? '' } })}
      confirmLabel={t('partners.deletionRequest.withdrawAction')}
      busy={state.loading}
      onConfirm={() => fireAndForget(confirm(), logs.portal['partners-app'], 'WithdrawDeletionDialog', 'withdraw')}
      onClose={onClose}
    />
  );
}
