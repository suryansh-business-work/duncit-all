import { MaterialIcons } from '@expo/vector-icons';
import { XStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

export interface RatingStarsProps {
  value: number;
  onChange: (value: number) => void;
  max?: number;
}

/** Tappable 1–N star rating — RN twin of mWeb's <Rating/> for live feedback. */
export function RatingStars({ value, onChange, max = 5 }: Readonly<RatingStarsProps>) {
  const { t } = useTranslation();
  const { muted, warning } = useThemeColors();
  // One pick out of N: a radio group, the twin of MUI's <Rating/> radios.
  return (
    <XStack gap={4} testID="rating-stars" role="radiogroup" aria-label={t('mweb.shop.rating')}>
      {Array.from({ length: max }, (_, i) => i + 1).map((star) => (
        <XStack
          key={star}
          testID={`rating-star-${star}`}
          role="radio"
          aria-label={`${star} star`}
          aria-checked={star === value}
          tabIndex={0}
          hitSlop={4}
          onPress={() => onChange(star)}
          pressStyle={PRESS_STYLE.row}
        >
          <MaterialIcons
            name={star <= value ? 'star' : 'star-border'}
            size={32}
            color={star <= value ? warning : muted}
          />
        </XStack>
      ))}
    </XStack>
  );
}
