import type { ComponentProps } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, YStack } from 'tamagui';

import { AppImage } from '@/components/AppImage';
import type { VibeIconLayout } from '@/hooks/useHomeFeed';
import { useThemeColors } from '@/hooks/useThemeColors';

type IconName = ComponentProps<typeof MaterialIcons>['name'];
type FlexDirection = 'column' | 'column-reverse' | 'row' | 'row-reverse';

/** Icon placement (relative to the label) → Tamagui `flexDirection` for the tab.
 * Hoisted to module scope so the resolve stays a single lookup; a missing/unknown
 * position falls back to 'column' (the current icon-over-label look). */
const POSITION_TO_DIRECTION: Record<string, FlexDirection> = {
  TOP: 'column',
  BOTTOM: 'column-reverse',
  LEFT: 'row',
  RIGHT: 'row-reverse',
};

/** Server default icon size (px) when a category has no configured layout. */
const DEFAULT_ICON_SIZE = 40;

interface TabIconProps {
  testID: string;
  icon?: string;
  fallback: IconName;
  tint: string;
  width: number;
  height: number;
}

/** Renders the tab's icon full-bleed (no badge): an image thumbnail for a URL,
 * an emoji/text for a short string, or a MaterialIcons fallback when the category
 * has no icon. Sized by the category's configured width/height. */
function TabIcon({ testID, icon, fallback, tint, width, height }: Readonly<TabIconProps>) {
  if (icon?.startsWith('http')) {
    return (
      <AppImage
        testID={`${testID}-image`}
        source={{ uri: icon }}
        style={{ width, height, borderRadius: 12 }}
      />
    );
  }
  if (icon) {
    return (
      <Text testID={`${testID}-emoji`} fontSize={height}>
        {icon}
      </Text>
    );
  }
  return <MaterialIcons name={fallback} size={height} color={tint} />;
}

interface VibeCategoryTabProps {
  testID: string;
  label: string;
  icon?: string;
  /** CATEGORY-level icon placement + size; null → the default TOP / 40x40 look. */
  iconLayout?: VibeIconLayout | null;
  fallback?: IconName;
  selected: boolean;
  onPress: () => void;
}

/** A single icon+label tab in the vibe category tabber. The icon's placement
 * relative to the label (TOP/BOTTOM/LEFT/RIGHT) and its size come from the
 * category's `iconLayout`; the selected state is an underline bar plus a
 * primary-coloured label. */
export function VibeCategoryTab({
  testID,
  label,
  icon,
  iconLayout,
  fallback = 'category',
  selected,
  onPress,
}: Readonly<VibeCategoryTabProps>) {
  const { primary, color } = useThemeColors();
  const tint = selected ? primary : color;
  const flexDirection = POSITION_TO_DIRECTION[iconLayout?.position ?? ''] ?? 'column';
  const iconWidth = iconLayout?.width ?? DEFAULT_ICON_SIZE;
  const iconHeight = iconLayout?.height ?? DEFAULT_ICON_SIZE;

  return (
    <YStack
      testID={testID}
      role="button"
      aria-label={label}
      aria-pressed={selected}
      onPress={onPress}
      flexDirection={flexDirection}
      width={74}
      alignItems="center"
      gap={5}
      paddingVertical={4}
      pressStyle={{ opacity: 0.85 }}
    >
      <YStack width={iconWidth} height={iconHeight} alignItems="center" justifyContent="center">
        <TabIcon
          testID={testID}
          icon={icon}
          fallback={fallback}
          tint={tint}
          width={iconWidth}
          height={iconHeight}
        />
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
