import type { ComponentProps } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';

type IconName = ComponentProps<typeof MaterialIcons>['name'];

interface Props {
  title: string;
  description: string;
  icon: IconName;
  disabled: boolean;
  /** Label shown when disabled (role held / meeting pending). */
  disabledLabel?: string;
  onPress: () => void;
  testID: string;
}

/** A single "earn" path card on the Earn with Duncit screen — disabled when the
 * user already holds the matching role. */
export function EarnBox({
  title,
  description,
  icon,
  disabled,
  disabledLabel = 'Already enabled',
  onPress,
  testID,
}: Readonly<Props>) {
  const { onPrimary } = useThemeColors();
  const handlePress = () => {
    if (!disabled) onPress();
  };

  return (
    <YStack
      testID={testID}
      role="button"
      aria-label={title}
      aria-disabled={disabled}
      onPress={handlePress}
      opacity={disabled ? 0.55 : 1}
      gap={8}
      padding={16}
      borderRadius={16}
      borderWidth={1}
      borderColor="$borderColor"
      backgroundColor="$surface"
      pressStyle={disabled ? undefined : { opacity: 0.85 }}
    >
      <YStack
        width={44}
        height={44}
        borderRadius={12}
        alignItems="center"
        justifyContent="center"
        backgroundColor="$primary"
      >
        <MaterialIcons name={icon} size={22} color={onPrimary} />
      </YStack>
      <Text fontSize={16} fontWeight="900" color="$color">
        {title}
      </Text>
      <Text fontSize={13} color="$muted">
        {description}
      </Text>
      {disabled ? (
        <Text testID={`${testID}-enabled`} fontSize={12} fontWeight="800" color="$primary">
          {disabledLabel}
        </Text>
      ) : null}
    </YStack>
  );
}
