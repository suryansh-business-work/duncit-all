import { Spinner, Text, XStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import { PRESS_STYLE } from '@duncit/buttons-native';

interface Props {
  cancelLabel: string;
  /** The confirm button's accessible name. */
  confirmLabel: string;
  /** What the confirm button reads — `confirmLabel` unless it says "…ing". */
  confirmText?: string;
  busy: boolean;
  destructive: boolean;
  cancelTestID: string;
  confirmTestID: string;
  onCancel: () => void;
  onConfirm: () => void;
}

const PILL_HEIGHT = 48;

/**
 * The two pills every confirmation ends in: an outlined Cancel and a filled
 * confirm — green, or danger for a destructive step — that spins while the
 * action is with the server. While `busy` neither takes a press. mWeb twin:
 * the DialogActions of components/ConfirmDialog.
 */
export function ConfirmFooter({
  cancelLabel,
  confirmLabel,
  confirmText,
  busy,
  destructive,
  cancelTestID,
  confirmTestID,
  onCancel,
  onConfirm,
}: Readonly<Props>) {
  const { onPrimary } = useThemeColors();
  return (
    <XStack gap={12}>
      <XStack
        testID={cancelTestID}
        role="button"
        aria-label={cancelLabel}
        aria-disabled={busy}
        onPress={busy ? undefined : onCancel}
        flex={1}
        height={PILL_HEIGHT}
        alignItems="center"
        justifyContent="center"
        borderRadius={999}
        borderWidth={1}
        borderColor="$borderColor"
        opacity={busy ? 0.6 : 1}
        pressStyle={PRESS_STYLE.control}
      >
        <Text fontSize={15} fontWeight="600" color="$color">
          {cancelLabel}
        </Text>
      </XStack>
      <XStack
        testID={confirmTestID}
        role="button"
        aria-label={confirmLabel}
        aria-disabled={busy}
        onPress={busy ? undefined : onConfirm}
        flex={1}
        height={PILL_HEIGHT}
        gap={8}
        alignItems="center"
        justifyContent="center"
        borderRadius={999}
        backgroundColor={destructive ? '$danger' : '$primary'}
        opacity={busy ? 0.7 : 1}
        pressStyle={PRESS_STYLE.solid}
      >
        {busy ? <Spinner size="small" color={onPrimary} /> : null}
        <Text fontSize={15} fontWeight="600" color={onPrimary}>
          {confirmText ?? confirmLabel}
        </Text>
      </XStack>
    </XStack>
  );
}
