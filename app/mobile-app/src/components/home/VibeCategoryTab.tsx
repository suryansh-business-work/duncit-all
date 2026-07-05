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
  tint: string;
}

/** Renders the tab's icon full-bleed (no badge): an image thumbnail for a URL,
 * an emoji/text for a short string, or a MaterialIcons fallback when the category
 * has no icon. */
function TabIcon({ testID, icon, fallback, tint }: Readonly<TabIconProps>) {
  if (icon?.startsWith('http')) {
    return (
      <AppImage
        testID={`${testID}-image`}
        source={{ uri: icon }}
        style={{ width: 46, height: 46, borderRadius: 12 }}
      />
    );
  }
  if (icon) {
    return (
      <Text testID={`${testID}-emoji`} fontSize={36}>
        {icon}
      </Text>
    );
  }
  return <MaterialIcons name={fallback} size={36} color={tint} />;
}

interface VibeCategoryTabProps {
  testID: string;
  label: string;
  icon?: string;
  fallback?: IconName;
  selected: boolean;
  onPress: () => void;
}

/** A single vertical icon-over-label tab in the vibe category tabber. The icon is
 * shown full-size with no circular badge; the selected state is an underline bar
 * plus a primary-coloured label. */
export function VibeCategoryTab({
  testID,
  label,
  icon,
  fallback = 'category',
  selected,
  onPress,
}: Readonly<VibeCategoryTabProps>) {
  const { primary, color } = useThemeColors();
  const tint = selected ? primary : color;

  return (
    <YStack
      testID={testID}
      role="button"
      aria-label={label}
      aria-pressed={selected}
      onPress={onPress}
      width={74}
      alignItems="center"
      gap={5}
      paddingVertical={4}
      pressStyle={{ opacity: 0.85 }}
    >
      <YStack width={50} height={50} alignItems="center" justifyContent="center">
        <TabIcon testID={testID} icon={icon} fallback={fallback} tint={tint} />
      </YStack>
      <YStack
        testID={`${testID}-underline`}
        width={22}
        height={3}
        borderRadius={2}
        backgroundColor={selected ? '$primary' : 'transparent'}
      />
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
