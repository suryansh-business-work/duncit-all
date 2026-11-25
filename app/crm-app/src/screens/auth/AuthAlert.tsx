import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, useTheme } from 'tamagui';

import { RADII } from '@/constants/design';

/** The portal login card's error box (an error Alert): announced at once, above the form. */
export function AuthAlert({ message, testID }: Readonly<{ message: string; testID: string }>) {
  const theme = useTheme();
  return (
    <XStack
      role="alert"
      aria-live="assertive"
      gap="$2"
      alignItems="flex-start"
      backgroundColor="$dangerSoft"
      borderRadius={RADII.sm}
      padding="$3"
      testID={testID}
    >
      <MaterialIcons
        name="error-outline"
        size={20}
        color={theme.danger?.val}
        accessibilityElementsHidden
      />
      <Text flex={1} color="$danger" fontWeight="600">
        {message}
      </Text>
    </XStack>
  );
}
