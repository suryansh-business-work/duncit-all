import type { ComponentProps } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { AppImage } from '@/components/AppImage';
import { useThemeColors } from '@/hooks/useThemeColors';
import { PRESS_STYLE } from '@duncit/buttons-native';

type IconName = ComponentProps<typeof MaterialIcons>['name'];

/** The chip's icon circle, and the glyph inside it. */
const CIRCLE = 24;
const GLYPH = 16;

interface ChipIconProps {
  testID: string;
  icon?: string;
  fallback: IconName;
  tint: string;
  circle: number;
}

/** The chip's icon: an image filling the circle for a URL, an emoji/text for a
 * short string, or a MaterialIcons fallback when the category has no icon. */
function ChipIcon({ testID, icon, fallback, tint, circle }: Readonly<ChipIconProps>) {
  const glyph = Math.round((circle * GLYPH) / CIRCLE);
  if (icon?.startsWith('http')) {
    return (
      <AppImage
        testID={`${testID}-image`}
        source={{ uri: icon }}
        style={{ width: circle, height: circle }}
      />
    );
  }
  if (icon) {
    return (
      <Text testID={`${testID}-emoji`} fontSize={glyph} lineHeight={circle}>
        {icon}
      </Text>
    );
  }
  return <MaterialIcons name={fallback} size={glyph} color={tint} />;
}

interface VibeChipMarkProps {
  testID: string;
  icon?: string;
  fallback?: IconName;
  selected: boolean;
  /** Circle diameter; the sub-category pill passes a smaller one. */
  size?: number;
}

/** The icon circle at the left of a vibe chip — shared by the category chip and
 * the sub-category pill (HomeVibeChips). */
export function VibeChipMark({
  testID,
  icon,
  fallback = 'category',
  selected,
  size = CIRCLE,
}: Readonly<VibeChipMarkProps>) {
  const { color } = useThemeColors();
  return (
    <YStack
      width={size}
      height={size}
      borderRadius={size / 2}
      overflow="hidden"
      alignItems="center"
      justifyContent="center"
      backgroundColor={selected ? '$surface' : '$soft'}
    >
      <ChipIcon testID={testID} icon={icon} fallback={fallback} tint={color} circle={size} />
    </YStack>
  );
}

interface VibeCategoryTabProps {
  testID: string;
  label: string;
  icon?: string;
  fallback?: IconName;
  selected: boolean;
  onPress: () => void;
}

/** A top-level category chip: a surface pill with the category's icon in a
 * small circle at the left; selected = the green primary fill. mWeb twin:
 * VibeTab. */
export function VibeCategoryTab({
  testID,
  label,
  icon,
  fallback = 'category',
  selected,
  onPress,
}: Readonly<VibeCategoryTabProps>) {
  return (
    <XStack
      testID={testID}
      role="button"
      aria-label={label}
      aria-pressed={selected}
      accessibilityState={{ selected }}
      tabIndex={0}
      onPress={onPress}
      height={40}
      alignItems="center"
      gap={8}
      paddingLeft={8}
      paddingRight={14}
      borderRadius={999}
      borderWidth={1}
      borderColor={selected ? '$primary' : '$cardBorder'}
      backgroundColor={selected ? '$primary' : '$surface'}
      pressStyle={PRESS_STYLE.control}
    >
      <VibeChipMark testID={testID} icon={icon} fallback={fallback} selected={selected} />
      <Text
        fontSize={13}
        fontWeight="600"
        color={selected ? '$onPrimary' : '$color'}
        numberOfLines={1}
      >
        {label}
      </Text>
    </XStack>
  );
}
