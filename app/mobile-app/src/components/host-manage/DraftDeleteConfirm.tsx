import { ConfirmSheet } from '@/components/DuncitDialog';

interface Props {
  open: boolean;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

/** Confirmation sheet before permanently deleting a Create Pod draft. */
export function DraftDeleteConfirm({ open, busy, onCancel, onConfirm }: Readonly<Props>) {
  return (
    <ConfirmSheet
      open={open}
      busy={busy}
      testIDPrefix="draft-delete"
      title="Delete draft?"
      message="This in-progress pod will be permanently removed."
      cancelLabel="Cancel"
      confirmLabel="Delete"
      busyLabel="Deleting…"
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );
}
