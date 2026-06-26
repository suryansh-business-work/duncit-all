import type { ReactNode } from 'react';
import { Text, XStack, YStack } from 'tamagui';

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
      pressStyle={{ opacity: 0.85 }}
    >
      <Text fontSize={14} fontWeight="800" color={primary ? '$onPrimary' : '$color'}>
        {label}
      </Text>
    </XStack>
  );
}

/** Centered scrim + card the support modals render into. */
export function Backdrop({ testID, children }: Readonly<{ testID: string; children: ReactNode }>) {
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
    >
      <YStack
        width="100%"
        maxWidth={360}
        gap={12}
        padding={20}
        borderRadius={16}
        backgroundColor="$background"
      >
        {children}
      </YStack>
    </YStack>
  );
}
