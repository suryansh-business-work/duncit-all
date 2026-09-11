import { TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Avatar, AvatarImage, Text, XStack, YStack } from 'tamagui';

import { useThemeColors } from '@/hooks/useThemeColors';
import { formatDate } from '@/utils/date-format';

const STARS = [1, 2, 3, 4, 5] as const;

export interface ClubRating {
  id: string;
  user_id: string;
  user_name: string | null | undefined;
  user_photo: string | null | undefined;
  stars: number;
  comment: string | null | undefined;
  created_at: string;
}

/** A read-only five-star row, filled up to `value`. */
export function StarRow({ value, size = 16 }: Readonly<{ value: number; size?: number }>) {
  const { warning } = useThemeColors();
  return (
    <XStack gap={2}>
      {STARS.map((s) => (
        <MaterialIcons
          key={s}
          name={s <= Math.round(value) ? 'star' : 'star-border'}
          size={size}
          color={warning}
        />
      ))}
    </XStack>
  );
}

/** Five tappable stars — the rating the viewer is about to give. */
export function StarPicker({
  value,
  onChange,
}: Readonly<{ value: number; onChange: (v: number) => void }>) {
  const { warning } = useThemeColors();
  return (
    <XStack gap={4}>
      {STARS.map((s) => (
        <TouchableOpacity
          key={s}
          testID={`star-${s}`}
          onPress={() => onChange(s)}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
        >
          <MaterialIcons name={s <= value ? 'star' : 'star-border'} size={32} color={warning} />
        </TouchableOpacity>
      ))}
    </XStack>
  );
}

/** One review under the average: avatar, name, stars, date and the comment. */
export function ReviewRow({ review }: Readonly<{ review: ClubRating }>) {
  return (
    <YStack gap={4} paddingVertical={8} borderTopWidth={1} borderColor="$borderColor">
      <XStack alignItems="center" gap={10}>
        <Avatar circular size={36}>
          <AvatarImage src={review.user_photo ?? undefined} />
        </Avatar>
        <YStack flex={1}>
          <Text fontSize={14} fontWeight="600" color="$color">
            {review.user_name ?? 'Member'}
          </Text>
          <XStack alignItems="center" gap={6}>
            <StarRow value={review.stars} size={13} />
            <Text fontSize={12} color="$muted">
              {formatDate(review.created_at)}
            </Text>
          </XStack>
        </YStack>
      </XStack>
      {review.comment ? (
        <Text fontSize={13} color="$muted" numberOfLines={3}>
          {review.comment}
        </Text>
      ) : null}
    </YStack>
  );
}
