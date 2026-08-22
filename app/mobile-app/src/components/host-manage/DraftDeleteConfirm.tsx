import { ConfirmSheet } from '@/components/DuncitDialog';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  open: boolean;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/** Confirmation sheet before permanently deleting a Create Pod draft. */
export function DraftDeleteConfirm({ open, busy, onCancel, onConfirm }: Readonly<Props>) {
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
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}
