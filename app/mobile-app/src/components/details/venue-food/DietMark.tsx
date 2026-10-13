import { MaterialIcons } from '@expo/vector-icons';
import { YStack } from 'tamagui';
import { FOOD_DIET_KEYS, type VenueFoodDiet } from '@duncit/utils';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

type IconName = keyof typeof MaterialIcons.glyphMap;

const MARKS: Record<VenueFoodDiet, { icon: IconName; tone: 'success' | 'warning' | 'danger' }> = {
  VEG: { icon: 'circle', tone: 'success' },
  VEGAN: { icon: 'spa', tone: 'success' },
  EGG: { icon: 'egg', tone: 'warning' },
  NON_VEG: { icon: 'circle', tone: 'danger' },
};

/**
 * The boxed mark Indian menus print beside a dish — green for vegetarian, red
 * for non-vegetarian — with an egg and a leaf for the two it does not cover.
 * Colour is never the only signal: the mark carries the diet as its name.
 * Tamagui twin of mWeb's food/DietMark.
 */
export function DietMark({ diet }: Readonly<{ diet: VenueFoodDiet }>) {
  const { t } = useTranslation();
  const colors = useThemeColors();
  const mark = MARKS[diet] ?? MARKS.VEG;
  const color = colors[mark.tone];
  return (
    <YStack
      testID={`food-diet-${diet}`}
      role="img"
      aria-label={t(FOOD_DIET_KEYS[diet] ?? FOOD_DIET_KEYS.VEG)}
      width={18}
      height={18}
      alignItems="center"
      justifyContent="center"
      borderWidth={1.5}
      borderRadius={2}
      borderColor={color}
    >
      <MaterialIcons name={mark.icon} size={10} color={color} />
    </YStack>
  );
}
