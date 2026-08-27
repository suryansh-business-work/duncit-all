import { Spinner, Text, XStack } from 'tamagui';

import { DuncitDialog } from '@/components/DuncitDialog/DuncitDialog';
import { useThemeColors } from '@/hooks/useThemeColors';
import { PRESS_STYLE } from '@duncit/buttons-native';

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
  const { onPrimary } = useThemeColors();
  const dismiss = busy ? undefined : onCancel;

  const footer = (
    <XStack gap={12}>
      <XStack
        testID={`${testIDPrefix}-cancel`}
        role="button"
        aria-label={cancelLabel}
        aria-disabled={busy}
        onPress={dismiss}
        flex={1}
        height={46}
        alignItems="center"
        justifyContent="center"
        borderRadius={12}
        borderWidth={1}
        borderColor="$borderColor"
        opacity={busy ? 0.6 : 1}
        pressStyle={PRESS_STYLE.control}
      >
        <Text fontSize={14} fontWeight="600" color="$color">
          {cancelLabel}
        </Text>
      </XStack>
      <XStack
        testID={`${testIDPrefix}-confirm-btn`}
        role="button"
        aria-label={confirmLabel}
        aria-disabled={busy}
        onPress={busy ? undefined : onConfirm}
        flex={1}
        height={46}
        alignItems="center"
        justifyContent="center"
        gap={8}
        borderRadius={12}
        backgroundColor="$danger"
        opacity={busy ? 0.7 : 1}
        pressStyle={PRESS_STYLE.control}
      >
        {busy ? <Spinner size="small" color={onPrimary} /> : null}
        <Text fontSize={14} fontWeight="700" color={onPrimary}>
          {busy ? busyLabel : confirmLabel}
        </Text>
      </XStack>
    </XStack>
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
      <Text fontSize={13.5} color="$muted">
        {message}
      </Text>
    </DuncitDialog>
  );
}
