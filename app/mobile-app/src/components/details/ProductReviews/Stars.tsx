import { MaterialIcons } from '@expo/vector-icons';
import { XStack, YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

const STAR_HIT_SLOP = { top: 8, bottom: 8, left: 1, right: 1 } as const;

/** Tappable / read-only 5-star row. */
export function Stars({
  value,
  onChange,
  size,
}: Readonly<{ value: number; onChange?: (n: number) => void; size: number }>) {
  const { t } = useTranslation();
  const { warning } = useThemeColors();
  if (!onChange) {
    return (
      <XStack
        gap={2}
        role="img"
        aria-label={t('mweb.a11y.starRating', { vars: { rating: value } })}
      >
        {[1, 2, 3, 4, 5].map((n) => (
          <MaterialIcons
            key={n}
            name={n <= value ? 'star' : 'star-border'}
            size={size}
            color={warning}
          />
        ))}
      </XStack>
    );
  }
  return (
    <XStack gap={2} role="radiogroup" aria-label={t('mweb.shop.rating')}>
      {[1, 2, 3, 4, 5].map((n) => (
        <YStack
          pressStyle={PRESS_STYLE.surface}
          key={n}
          testID={`star-${n}`}
          role="radio"
          aria-checked={n === value}
          aria-label={t('mweb.a11y.rateStars', { vars: { stars: n } })}
          tabIndex={0}
          // Stars sit 2px apart: the extra reach is vertical, so a tap on a
          // star never counts as its neighbour.
          hitSlop={STAR_HIT_SLOP}
          onPress={() => onChange(n)}
        >
          <MaterialIcons name={n <= value ? 'star' : 'star-border'} size={size} color={warning} />
        </YStack>
      ))}
    </XStack>
  );
}
