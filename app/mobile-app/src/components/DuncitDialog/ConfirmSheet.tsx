import { Text } from 'tamagui';

import { DuncitDialog } from '@/components/DuncitDialog/DuncitDialog';
import { ConfirmFooter } from '@/components/DuncitDialog/ConfirmFooter';

interface Props {
  open: boolean;
  /** In flight — the sheet refuses to dismiss and the CTA shows a spinner. */
  busy: boolean;
  /**
   * Test-id stem, e.g. `draft-delete`. The dialog is `<stem>-confirm`, the two
   * controls are `<stem>-cancel` and `<stem>-confirm-btn`.
   */
  testIDPrefix: string;
  title: string;
  message: string;
  cancelLabel: string;
  /** CTA copy at rest, e.g. `Delete`. */
  confirmLabel: string;
  /** CTA copy while `busy`, e.g. `Deleting…`. */
  busyLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}

/**
 * The app's destructive confirmation, centred.
 *
 * Every confirm in the app asked the same four things — a title, a sentence of
 * consequence, a bordered Cancel and a danger CTA that spins — and each one
 * rebuilt them, without a scroll area, so a longer message was simply clipped.
 * The message now scrolls inside {@link DuncitDialog} while the two buttons stay
 * pinned in its footer, which is the whole point: the way out of a destructive
 * step must not scroll away.
 *
 * While `busy` the scrim and the header ✕ are both disabled, so the only way
 * out of an in-flight delete is the footer.
 */
export function ConfirmSheet({
  open,
  busy,
  testIDPrefix,
  title,
  message,
  cancelLabel,
  confirmLabel,
  busyLabel,
  onCancel,
  onConfirm,
}: Readonly<Props>) {
  const footer = (
    <ConfirmFooter
      cancelLabel={cancelLabel}
      confirmLabel={confirmLabel}
      confirmText={busy ? busyLabel : confirmLabel}
      busy={busy}
      destructive
      cancelTestID={`${testIDPrefix}-cancel`}
      confirmTestID={`${testIDPrefix}-confirm-btn`}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  );

  return (
    <DuncitDialog
      open={open}
      onClose={onCancel}
      testID={`${testIDPrefix}-confirm`}
      title={title}
      closeLabel={cancelLabel}
      variant="center"
      // A destructive step should not vanish on a stray tap, and never mid-flight.
      dismissOnBackdrop={false}
      showCloseButton={!busy}
      footer={footer}
    >
      <Text fontSize={14} lineHeight={20} color="$muted">
        {message}
      </Text>
    </DuncitDialog>
  );
}
