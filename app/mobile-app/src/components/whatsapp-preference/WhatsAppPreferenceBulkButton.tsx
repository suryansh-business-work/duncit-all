import { Text, XStack } from 'tamagui';

import { PRESS_STYLE } from '@duncit/buttons-native';

interface Props {
  label: string;
  /** Off-everything reads as destructive; back-on reads as ordinary. */
  destructive: boolean;
  disabled: boolean;
  onPress: () => void;
}

/**
 * "Turn off everything optional" / "Turn everything back on".
 *
 * One button whose direction the screen decides, rather than two that could
 * both be on screen at once — the state it acts on is "is anything still on?",
 * and two buttons make that a question the reader has to answer. A tonal pill:
 * danger-soft to switch off, primary-soft to switch back on.
 */
export function WhatsAppPreferenceBulkButton({
  label,
  destructive,
  disabled,
  onPress,
}: Readonly<Props>) {
  return (
    <XStack
      testID="whatsapp-preference-bulk"
      role="button"
      aria-label={label}
      onPress={disabled ? undefined : onPress}
      marginTop={14}
      height={52}
      alignItems="center"
      justifyContent="center"
      borderRadius={999}
      backgroundColor={destructive ? '$dangerSoft' : '$primarySoft'}
      opacity={disabled ? 0.5 : 1}
      pressStyle={PRESS_STYLE.control}
    >
      <Text fontSize={15} fontWeight="600" color={destructive ? '$danger' : '$primary'}>
        {label}
      </Text>
    </XStack>
  );
}
