import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';

interface Props {
  locality?: string | null;
  testID: string;
}

/** The area a club operates in, as a small pin chip under its name. Renders
 * nothing when the club names no area. mWeb twin: components/LocalityChip. */
export function LocalityChip({ locality, testID }: Readonly<Props>) {
  const { muted } = useThemeColors();
  const label = locality?.trim();
  if (!label) return null;
  return (
    <XStack
      testID={testID}
      alignSelf="flex-start"
      alignItems="center"
      gap={4}
      height={24}
      paddingHorizontal={8}
      borderRadius={999}
      backgroundColor="$soft"
    >
      <MaterialIcons name="place" size={16} color={muted} />
      <Text fontSize={13} color="$color" numberOfLines={1}>
        {label}
      </Text>
    </XStack>
  );
}
