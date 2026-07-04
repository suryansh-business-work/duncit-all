import type { ComponentProps } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, YStack } from 'tamagui';

import { AppImage } from '@/components/AppImage';
import { useThemeColors } from '@/hooks/useThemeColors';

type IconName = ComponentProps<typeof MaterialIcons>['name'];

interface TabIconProps {
  testID: string;
  icon?: string;
  fallback: IconName;
  selected: boolean;
}

/** Renders the tab's icon: an image thumbnail for a URL, an emoji/text for a short
 * string, or a MaterialIcons fallback when the category has no icon. */
function TabIcon({ testID, icon, fallback, selected }: Readonly<TabIconProps>) {
  const { onPrimary, color } = useThemeColors();
  if (icon?.startsWith('http')) {
    return (
      <AppImage
        testID={`${testID}-image`}
        source={{ uri: icon }}
        style={{ width: 28, height: 28, borderRadius: 8 }}
      />
    );
  }
  if (icon) {
    return (
      <Text testID={`${testID}-emoji`} fontSize={22}>
        {icon}
      </Text>
    );
  }
  return <MaterialIcons name={fallback} size={24} color={selected ? onPrimary : color} />;
}

interface VibeCategoryTabProps {
  testID: string;
  label: string;
  icon?: string;
  fallback?: IconName;
  selected: boolean;
  onPress: () => void;
}

/** A single vertical icon-over-label tab in the vibe category tabber. */
export function VibeCategoryTab({
  testID,
  label,
  icon,
  fallback = 'category',
  selected,
  onPress,
}: Readonly<VibeCategoryTabProps>) {
  return (
    <YStack
      testID={testID}
      role="button"
      aria-label={label}
      aria-pressed={selected}
      onPress={onPress}
      width={74}
      alignItems="center"
      gap={6}
      paddingVertical={4}
      pressStyle={{ opacity: 0.85 }}
    >
      <YStack
        width={54}
        height={54}
        borderRadius={27}
        alignItems="center"
        justifyContent="center"
        backgroundColor={selected ? '$primary' : '$surface'}
        borderWidth={1.5}
        borderColor={selected ? '$primary' : '$borderColor'}
      >
        <TabIcon testID={testID} icon={icon} fallback={fallback} selected={selected} />
      </YStack>
      <Text
        fontSize={11.5}
        fontWeight="800"
        color={selected ? '$primary' : '$muted'}
        numberOfLines={1}
      >
        {label}
      </Text>
    </YStack>
  );
}
