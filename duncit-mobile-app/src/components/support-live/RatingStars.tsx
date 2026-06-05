import { MaterialIcons } from '@expo/vector-icons';
import { XStack } from 'tamagui';
import { semantic } from '@duncit/auth-tokens';

import { useThemeColors } from '@/hooks/useThemeColors';

export interface RatingStarsProps {
  value: number;
  onChange: (value: number) => void;
  max?: number;
}

/** Tappable 1–N star rating — RN twin of mWeb's <Rating/> for live feedback. */
export function RatingStars({ value, onChange, max = 5 }: RatingStarsProps) {
  const { muted } = useThemeColors();
  return (
    <XStack gap={4} testID="rating-stars">
      {Array.from({ length: max }, (_, i) => i + 1).map((star) => (
        <XStack
          key={star}
          testID={`rating-star-${star}`}
          role="button"
          aria-label={`${star} star`}
          aria-selected={star <= value}
          onPress={() => onChange(star)}
          pressStyle={{ opacity: 0.7 }}
        >
          <MaterialIcons
            name={star <= value ? 'star' : 'star-border'}
            size={32}
            color={star <= value ? semantic.warning : muted}
          />
        </XStack>
      ))}
    </XStack>
  );
}
