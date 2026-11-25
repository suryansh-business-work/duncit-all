import { useState } from 'react';
import { fireAndForget, logs } from '@duncit/logs';

import { ConfirmDialog } from '@/components/ConfirmDialog';
import type { LeadListKind, LeadListRow } from '@/features/leads-list/listKinds';
import { useTranslation } from '@/hooks/useTranslation';
import { errorMessage } from '@/utils/errors';

interface Props {
  definition: LeadListKind;
  /** The lead to delete; closed while null. */
  row: LeadListRow | null;
  onClose: () => void;
  onDeleted: (message: string) => void;
}

/** Delete a lead from its listing, after a confirm — the portal's delete dialog. */
export function LeadListDeleteDialog({ definition, row, onClose, onDeleted }: Readonly<Props>) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const cancel = () => {
    setError(null);
    onClose();
  };
  const confirm = async () => {
    if (!row) return;
    setBusy(true);
    setError(null);
    try {
      await definition.remove(row.id);
      onDeleted(t(definition.copy.deleted));
    } catch (err) {
      setError(errorMessage(err, t('crmApp.common.saveFailed')));
    } finally {
      setBusy(false);
    }
  };
  return (
    <ConfirmDialog
      open={row !== null}
      title={t(definition.copy.deleteTitle)}
      message={t(definition.copy.deleteMessage, { vars: { name: row?.name ?? '' } })}
      confirmLabel={t('shell.common.delete')}
      cancelLabel={t('shell.common.cancel')}
      danger
      busy={busy}
      error={error}
      onConfirm={() =>
        fireAndForget(confirm(), logs.mobileApp, 'crm-app/LeadListDeleteDialog', 'delete')
      }
      onCancel={cancel}
      testID="lead-list-delete-dialog"
    />
  );
}
