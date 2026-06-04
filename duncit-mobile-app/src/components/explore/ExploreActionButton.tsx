import type { ComponentProps } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Spinner, Text, YStack } from 'tamagui';

type IconName = ComponentProps<typeof MaterialIcons>['name'];

interface ExploreActionButtonProps {
  icon: IconName;
  label: string;
  onPress: () => void;
  active?: boolean;
  loading?: boolean;
  testID?: string;
}

/** A round glassy action button with a caption — the reels' right-side rail. */
export function ExploreActionButton({
  icon,
  label,
  onPress,
  active,
  loading,
  testID,
}: ExploreActionButtonProps) {
  return (
    <YStack
      testID={testID}
      role="button"
      aria-label={label}
      onPress={onPress}
      alignItems="center"
      gap={3}
      pressStyle={{ opacity: 0.7 }}
    >
      <YStack
        width={46}
        height={46}
        borderRadius={23}
        alignItems="center"
        justifyContent="center"
        backgroundColor={active ? 'rgba(255,79,115,0.9)' : 'rgba(0,0,0,0.4)'}
      >
        {loading ? (
          <Spinner color="#ffffff" />
        ) : (
          <MaterialIcons name={icon} size={22} color="#ffffff" />
        )}
      </YStack>
      <Text fontSize={11} fontWeight="800" color="#ffffff">
        {label}
      </Text>
    </YStack>
  );
}
