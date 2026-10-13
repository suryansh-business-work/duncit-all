import { MaterialIcons } from '@expo/vector-icons';
import { XStack } from 'tamagui';
import { FOOD_SPICE_HEAT, FOOD_SPICE_KEYS, type VenueFoodSpiceLevel } from '@duncit/utils';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';

/** One id per flame a dish can show, so the row has stable keys. */
const FLAMES = ['mild', 'medium', 'hot', 'extra-hot'] as const;

/** How hot a dish is, as one to four flames. A dish with no heat shows nothing.
 * Tamagui twin of mWeb's food/SpiceMark. */
export function SpiceMark({ level }: Readonly<{ level: VenueFoodSpiceLevel }>) {
  const { t } = useTranslation();
  const { danger } = useThemeColors();
  const heat = FOOD_SPICE_HEAT[level] ?? 0;
  if (heat === 0) return null;
  return (
    <XStack
      testID={`food-spice-${level}`}
      role="img"
      aria-label={t(FOOD_SPICE_KEYS[level])}
      alignItems="center"
    >
      {FLAMES.slice(0, heat).map((flame) => (
        <MaterialIcons key={flame} name="local-fire-department" size={14} color={danger} />
      ))}
    </XStack>
  );
}
