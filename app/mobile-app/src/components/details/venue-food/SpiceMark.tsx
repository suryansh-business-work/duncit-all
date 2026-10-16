import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack } from 'tamagui';
import { FOOD_SPICE_HEAT, FOOD_SPICE_KEYS, type VenueFoodSpiceLevel } from '@duncit/utils';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

/** One id per flame a dish can show, so the row has stable keys. */
const FLAMES = ['mild', 'medium', 'hot', 'extra-hot'] as const;

interface Props {
  level: VenueFoodSpiceLevel;
  /** Say "Not spicy" for a dish with no heat — the dish screen does; the menu card stays quiet. */
  showNone?: boolean;
}

/** How hot a dish is: one to four flames and the level in words. A dish with
 * no heat shows nothing unless `showNone` asks for its "Not spicy" line.
 * Tamagui twin of mWeb's food/SpiceMark. */
export function SpiceMark({ level, showNone = false }: Readonly<Props>) {
  const { t } = useTranslation();
  const { danger } = useThemeColors();
  const heat = FOOD_SPICE_HEAT[level] ?? 0;
  if (heat === 0 && !showNone) return null;
  return (
    <XStack testID={`food-spice-${level}`} alignItems="center" gap={2}>
      {FLAMES.slice(0, heat).map((flame) => (
        <MaterialIcons
          key={flame}
          name="local-fire-department"
          size={14}
          color={danger}
          aria-hidden
        />
      ))}
      <Text
        fontSize={12}
        fontWeight="600"
        color={heat ? danger : '$muted'}
        paddingLeft={heat ? 2 : 0}
      >
        {t(FOOD_SPICE_KEYS[level])}
      </Text>
    </XStack>
  );
}
