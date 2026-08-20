import { ConfirmSheet } from '@/components/DuncitDialog';

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
  return (
    <ConfirmSheet
      open={open}
      busy={busy}
      testIDPrefix="idea-delete"
      title="Delete this idea?"
      message="This permanently removes the idea, its likes, and all comments."
      cancelLabel="Cancel"
      confirmLabel="Delete"
      busyLabel="Deleting…"
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}
