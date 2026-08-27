import type { ReactNode } from 'react';
import { ScrollView, useWindowDimensions } from 'react-native';
import { Text, XStack, YStack } from 'tamagui';

import { useKeyboardInset } from '@/hooks/useKeyboardInset';
import { PRESS_STYLE } from '@duncit/buttons-native';

interface ButtonProps {
  testID: string;
  label: string;
  primary?: boolean;
  disabled?: boolean;
  onPress: () => void;
}

/** A pill button used in the support modals (no MUI / no Alert.alert). */
export function ModalButton({ testID, label, primary, disabled, onPress }: Readonly<ButtonProps>) {
  return (
    <XStack
      testID={testID}
      role="button"
      aria-label={label}
      aria-disabled={disabled}
      onPress={disabled ? undefined : onPress}
      height={42}
      paddingHorizontal={18}
      alignItems="center"
      justifyContent="center"
      borderRadius={999}
      borderWidth={primary ? 0 : 1}
      borderColor="$borderColor"
      backgroundColor={primary ? '$primary' : 'transparent'}
      opacity={disabled ? 0.5 : 1}
      pressStyle={PRESS_STYLE.control}
    >
      <Text fontSize={14} fontWeight="600" color={primary ? '$onPrimary' : '$color'}>
        {label}
      </Text>
    </XStack>
  );
}

interface BackdropProps {
  testID: string;
  children: ReactNode;
  /** Action row, pinned under the scroll area so it survives a long body. */
  footer?: ReactNode;
}

/**
 * Centered scrim + card the support modals render into.
 *
 * Not an RN `<Modal>` — it is an absolute overlay inside the support chat
 * screen, which is why it cannot use {@link DuncitDialog} — but it needs the
 * same three guarantees, and had none of them: three of its four consumers hold
 * a `TextArea`, so with the keyboard open the card sat behind it, and with a
 * long body (a validation error plus a deadline line plus a filled comment) the
 * action row had nowhere to go.
 *
 * The lift uses `useKeyboardInset` for the reason given in `KeyboardScreen`:
 * `KeyboardAvoidingView` measures against a window that no longer resizes under
 * the edge-to-edge window Expo SDK 54 forces on Android.
 */
export function Backdrop({ testID, children, footer }: Readonly<BackdropProps>) {
  const { height: windowHeight } = useWindowDimensions();
  const keyboardInset = useKeyboardInset();
  // Measured against the LIVE window minus whatever the keyboard covers, so a
  // short screen, a landscape window and an open keyboard all re-measure.
  const maxHeight = Math.max(Math.round((windowHeight - keyboardInset) * 0.85), 180);

  return (
    <YStack
      testID={testID}
      position="absolute"
      top={0}
      left={0}
      right={0}
      bottom={0}
      zIndex={100}
      backgroundColor="rgba(0,0,0,0.5)"
      alignItems="center"
      justifyContent="center"
      padding={24}
      paddingBottom={24 + keyboardInset}
    >
      <YStack
        width="100%"
        maxWidth={360}
        maxHeight={maxHeight}
        borderRadius={16}
        backgroundColor="$background"
        overflow="hidden"
      >
        <ScrollView
          // A direct child of the capped card: RN gives ScrollView
          // `flexShrink: 1`, so it is the part that gives way.
          style={{ flexShrink: 1 }}
          contentContainerStyle={{ padding: 20, gap: 12 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
        {footer ? (
          <YStack
            paddingHorizontal={20}
            paddingVertical={12}
            borderTopWidth={1}
            borderTopColor="$borderColor"
          >
            {footer}
          </YStack>
        ) : null}
      </YStack>
    </YStack>
  );
}
