import { Text, XStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';

interface Props {
  label: string;
  /** Off-everything reads as destructive; back-on reads as ordinary. */
  destructive: boolean;
  disabled: boolean;
  onPress: () => void;
}

/**
 * "Unsubscribe from everything optional" / "Turn everything back on".
 *
 * One button whose direction the screen decides, rather than two that could
 * both be on screen at once — the state it acts on is "is anything still on?",
 * and two buttons make that a question the reader has to answer.
 */
export function MailPreferenceBulkButton({
  label,
  destructive,
  disabled,
  onPress,
}: Readonly<Props>) {
  const { danger, primary } = useThemeColors();
  const ink = destructive ? danger : primary;

  return (
    <XStack
      testID="mail-preference-bulk"
      role="button"
      aria-label={label}
      onPress={disabled ? undefined : onPress}
      marginTop={14}
      height={46}
      alignItems="center"
      justifyContent="center"
      borderRadius={12}
      borderWidth={1}
      borderColor={ink}
      opacity={disabled ? 0.5 : 1}
      pressStyle={{ opacity: 0.85 }}
    >
      <Text fontSize={14} fontWeight="700" color={ink}>
        {label}
      </Text>
    </XStack>
  );
}
