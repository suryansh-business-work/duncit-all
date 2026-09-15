import type { ReactNode } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';
import { PRESS_STYLE } from '@duncit/buttons-native';

import { SurfaceCard } from '@/components/SurfaceCard';
import { useThemeColors } from '@/hooks/useThemeColors';

interface Props {
  testID: string;
  icon: ReactNode;
  label: string;
  onPress: () => void;
}

/** One tappable row under "Your name has been added": an icon disc, the
 * label and a chevron. mWeb twin: components/city-launch/CityLaunchActionTile. */
export function CityLaunchActionTile({ testID, icon, label, onPress }: Readonly<Props>) {
  const { muted } = useThemeColors();
  return (
    <SurfaceCard testID={testID} padding={0} overflow="hidden">
      <XStack
        testID={`${testID}-button`}
        role="button"
        aria-label={label}
        tabIndex={0}
        onPress={onPress}
        alignItems="center"
        gap={12}
        padding={12}
        pressStyle={PRESS_STYLE.surface}
      >
        <YStack
          width={40}
          height={40}
          borderRadius={20}
          alignItems="center"
          justifyContent="center"
          backgroundColor="$soft"
        >
          {icon}
        </YStack>
        <Text flex={1} fontSize={15} lineHeight={20} fontWeight="600" color="$color">
          {label}
        </Text>
        <MaterialIcons name="chevron-right" size={24} color={muted} />
      </XStack>
    </SurfaceCard>
  );
}
