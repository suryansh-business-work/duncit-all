import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack } from 'tamagui';

const STARS = [1, 2, 3, 4, 5];

interface Props {
  aspect: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  /** Screen-reader text for each star, e.g. "Rate Host 3 out of 5". */
  starLabel: (stars: number) => string;
}

/**
 * One line of the rating sheet: what is being scored, and its stars.
 *
 * The RN twin of mWeb's AspectRatingRow (rule 27). Each part of a pod gets its
 * own row rather than one blanket score, because a guest who loved the evening
 * and was let down by the room has said two different things.
 */
export function AspectRatingRow({ aspect, label, value, onChange, starLabel }: Readonly<Props>) {
  return (
    <XStack alignItems="center" justifyContent="space-between" gap={8} paddingVertical={4}>
      <Text fontSize={13} fontWeight="600" color="$color" flexShrink={1}>
        {label}
      </Text>
      <XStack gap={2} flexShrink={0}>
        {STARS.map((star) => (
          <XStack
            key={star}
            testID={`pod-feedback-${aspect}-star-${star}`}
            role="button"
            aria-label={starLabel(star)}
            onPress={() => onChange(star)}
            pressStyle={{ opacity: 0.7 }}
            padding={2}
          >
            <MaterialIcons
              name={star <= value ? 'star' : 'star-border'}
              size={24}
              color="#f5a623"
            />
          </XStack>
        ))}
      </XStack>
    </XStack>
  );
}
