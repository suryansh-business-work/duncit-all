import { Text, XStack } from 'tamagui';
import { PRESS_STYLE } from '@duncit/buttons-native';

import { useThemeColors } from '@/hooks/useThemeColors';

interface Props {
  /** The label announced to screen readers (never the transient "Sending…"). */
  idleLabel: string;
  /** What the pill shows right now. */
  label: string;
  sending: boolean;
  disabled: boolean;
  onPress: () => void;
}

/** The soft "Send OTP" / "Resend OTP" pill beside the code field. */
export function EmailOtpSendButton({
  idleLabel,
  label,
  sending,
  disabled,
  onPress,
}: Readonly<Props>) {
  const { muted } = useThemeColors();
  return (
    <XStack
      testID="email-verification-send"
      role="button"
      aria-label={idleLabel}
      aria-disabled={disabled}
      aria-busy={sending}
      tabIndex={0}
      onPress={() => {
        if (!disabled) onPress();
      }}
      height={44}
      paddingHorizontal={16}
      alignItems="center"
      justifyContent="center"
      borderRadius={999}
      backgroundColor="$soft"
      opacity={disabled ? 0.5 : 1}
      pressStyle={PRESS_STYLE.control}
    >
      <Text fontSize={13} fontWeight="600" color={muted}>
        {label}
      </Text>
    </XStack>
  );
}
