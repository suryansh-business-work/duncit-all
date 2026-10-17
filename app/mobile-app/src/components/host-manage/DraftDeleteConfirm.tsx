import { ConfirmSheet } from '@/components/DuncitDialog';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  open: boolean;
  busy: boolean;
  /** The last delete failed: said inside the sheet, which stays open to retry. */
  error?: string | null;
  onCancel: () => void;
  onConfirm: () => void;
}

/** Confirmation sheet before permanently deleting a Create Pod draft. */
export function DraftDeleteConfirm({ open, busy, error, onCancel, onConfirm }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <ConfirmSheet
      open={open}
      busy={busy}
      testIDPrefix="draft-delete"
      title={t('mweb.common.deleteDraft')}
      message={t('mweb.common.thisInProgressPodWillBe')}
      cancelLabel={t('mweb.common.cancel')}
      confirmLabel={t('mweb.common.delete')}
      busyLabel="Deleting…"
      error={error}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}
