import { ConfirmSheet } from '@/components/DuncitDialog';
import { useTranslation } from '@/hooks/useTranslation';

interface Props {
  open: boolean;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * Confirmation sheet before permanently deleting one of the viewer's own ideas
 * (its likes and comments go with it). RN twin of mWeb's delete ConfirmDialog.
 */
export function IdeaDeleteConfirm({ open, busy, onCancel, onConfirm }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <ConfirmSheet
      open={open}
      busy={busy}
      testIDPrefix="idea-delete"
      title={t('mweb.podIdeas.deleteThisIdea')}
      message={t('mweb.podIdeas.thisPermanentlyRemovesTheIdeaIts')}
      cancelLabel={t('mweb.common.cancel')}
      confirmLabel={t('mweb.common.delete')}
      busyLabel="Deleting…"
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}
