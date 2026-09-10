import { Spinner, Text, XStack } from 'tamagui';

import { DuncitDialog } from '@/components/DuncitDialog';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

interface Props {
  open: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  /** The confirmed action is still with the server: Confirm spins, and neither
   *  button nor the backdrop can dismiss the dialog until it answers. Twin of
   *  mWeb's ConfirmDialog `busy` (rule 27). */
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  testID?: string;
}

/** Reusable confirmation dialog (Tamagui) — title + message + cancel/confirm.
 * Replaces native alert/confirm dialogs per the MUI/Tamagui-only rule.
 *
 * Built on {@link DuncitDialog} rather than its own `<Modal>`: it used to be a
 * bare card with no height cap and no scroller, which was safe only while every
 * `message` stayed short — a long localized string or a large system font scale
 * pushed the buttons off-screen with no way to reach them. */
export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  destructive = false,
  busy = false,
  onConfirm,
  onCancel,
  testID = 'confirm-dialog',
}: Readonly<Props>) {
  const { t } = useTranslation();
  // Resolved here, not as parameter defaults: a default is evaluated before
  // any hook runs, so `t` would not exist yet.
  const confirmLabelText = confirmLabel ?? t('mweb.confirm.confirm');
  const cancelLabelText = cancelLabel ?? t('mweb.common.cancel');
  const { onPrimary } = useThemeColors();

  const footer = (
    <XStack gap={12}>
      <XStack
        testID={`${testID}-cancel`}
        role="button"
        aria-label={cancelLabelText}
        aria-disabled={busy}
        onPress={busy ? undefined : onCancel}
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
          {cancelLabelText}
        </Text>
      </XStack>
      <XStack
        testID={`${testID}-confirm`}
        role="button"
        aria-label={confirmLabelText}
        aria-disabled={busy}
        onPress={busy ? undefined : onConfirm}
        flex={1}
        height={46}
        gap={8}
        alignItems="center"
        justifyContent="center"
        borderRadius={12}
        backgroundColor={destructive ? '$danger' : '$primary'}
        opacity={busy ? 0.7 : 1}
        pressStyle={PRESS_STYLE.control}
      >
        {busy ? <Spinner size="small" color={onPrimary} /> : null}
        <Text fontSize={14} fontWeight="700" color={onPrimary}>
          {confirmLabelText}
        </Text>
      </XStack>
    </XStack>
  );

  return (
    <DuncitDialog
      open={open}
      onClose={onCancel}
      // A confirmed action already in flight must not be dismissed out from
      // under itself — the dialog is what says it is still running.
      dismissOnBackdrop={!busy}
      testID={testID}
      variant="center"
      title={title}
      closeLabel={cancelLabelText}
      // The footer already offers a way out, and a ✕ beside a Cancel button is
      // two controls for one action.
      showCloseButton={false}
      footer={footer}
    >
      {message ? (
        <Text fontSize={13.5} color="$muted" lineHeight={19}>
          {message}
        </Text>
      ) : null}
    </DuncitDialog>
  );
}
