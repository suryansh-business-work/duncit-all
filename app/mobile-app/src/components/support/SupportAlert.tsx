import type { ComponentProps } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';

type Variant = 'success' | 'error';

interface Props {
  variant: Variant;
  message: string;
  onClose: () => void;
  testID: string;
}

const ICON: Record<Variant, ComponentProps<typeof MaterialIcons>['name']> = {
  success: 'check-circle',
  error: 'error-outline',
};

/**
 * Boxed inline alert with an icon and a dismiss control — the RN twin of mWeb's
 * MUI `<Alert severity="success|error" onClose />`. The tone (green / red) comes
 * from the theme (`$success` / `$danger`) so it stays in lock-step with mWeb's
 * palette instead of a plain coloured line of text.
 */
export function SupportAlert({ variant, message, onClose, testID }: Readonly<Props>) {
  const { success, danger } = useThemeColors();
  const tone = variant === 'success' ? success : danger;
  return (
    <XStack
      testID={testID}
      alignItems="center"
      gap={8}
      padding={10}
      borderRadius={12}
      borderWidth={1}
      borderColor={tone}
      backgroundColor={`${tone}22`} // ~13% tint of the tone — mirrors MUI's filled Alert
    >
      <MaterialIcons name={ICON[variant]} size={18} color={tone} />
      <Text flex={1} fontSize={13} fontWeight="700" color={tone}>
        {message}
      </Text>
      <XStack
        testID={`${testID}-close`}
        role="button"
        aria-label="Dismiss"
        onPress={onClose}
        padding={2}
        pressStyle={{ opacity: 0.6 }}
      >
        <MaterialIcons name="close" size={16} color={tone} />
      </XStack>
    </XStack>
  );
}
