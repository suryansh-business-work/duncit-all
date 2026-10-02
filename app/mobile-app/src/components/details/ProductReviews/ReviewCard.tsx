import { MaterialIcons } from '@expo/vector-icons';
import { Text, XStack, YStack } from 'tamagui';

import { AppImage } from '@/components/AppImage';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

import { Stars } from './Stars';
import type { Review } from './types';

/** 16px thumbs reach 44pt tall; sideways only as far as the count between
 * them allows, so a tap there can never land on the other vote. */
const VOTE_HIT_SLOP = { top: 14, bottom: 14, left: 6, right: 6 } as const;

/** One posted review — author + stars, comment, photos, the seller reply and
 * the thumbs-up/down vote row. */
export function ReviewCard({
  review,
  ink,
  accent,
  muted,
  danger,
  onVote,
}: Readonly<{
  review: Review;
  ink: string;
  accent: string;
  muted: string;
  danger: string;
  onVote: (id: string, value: number, current: number) => void;
}>) {
  const { t } = useTranslation();
  const upvoted = review.my_vote === 1;
  const downvoted = review.my_vote === -1;
  return (
    <YStack gap={4} paddingTop={10} borderTopWidth={1} borderColor="$borderColor">
      <XStack gap={6} alignItems="center">
        <Text fontSize={13} fontWeight="600" color={ink}>
          {review.user_name}
        </Text>
        <Stars value={review.rating} size={14} />
      </XStack>
      {review.comment ? (
        <Text fontSize={13} color={ink}>
          {review.comment}
        </Text>
      ) : null}
      {review.images.length > 0 ? (
        <XStack gap={6}>
          {review.images.map((u) => (
            <AppImage
              key={u}
              source={{ uri: u }}
              accessibilityLabel={t('mweb.podDetails.review')}
              style={{ width: 56, height: 56, borderRadius: 8 }}
            />
          ))}
        </XStack>
      ) : null}
      {review.seller_reply ? (
        <YStack gap={2} padding={8} backgroundColor="$color2" borderRadius={8}>
          <Text fontSize={11} fontWeight="600" color={accent}>
            Seller response
          </Text>
          <Text fontSize={13} color={ink}>
            {review.seller_reply}
          </Text>
        </YStack>
      ) : null}
      <XStack gap={4} alignItems="center">
        <YStack
          pressStyle={PRESS_STYLE.surface}
          testID={`review-up-${review.id}`}
          role="button"
          aria-label={t('mweb.faqsPage.helpful')}
          aria-pressed={upvoted}
          accessibilityState={{ selected: upvoted }}
          tabIndex={0}
          hitSlop={VOTE_HIT_SLOP}
          onPress={() => onVote(review.id, 1, review.my_vote)}
        >
          <MaterialIcons name="thumb-up" size={16} color={upvoted ? accent : muted} />
        </YStack>
        <Text fontSize={12} color="$muted">
          {review.up_votes}
        </Text>
        <YStack
          pressStyle={PRESS_STYLE.surface}
          testID={`review-down-${review.id}`}
          role="button"
          aria-label={t('mweb.a11y.notHelpful')}
          aria-pressed={downvoted}
          accessibilityState={{ selected: downvoted }}
          tabIndex={0}
          hitSlop={VOTE_HIT_SLOP}
          onPress={() => onVote(review.id, -1, review.my_vote)}
        >
          <MaterialIcons name="thumb-down" size={16} color={downvoted ? danger : muted} />
        </YStack>
        <Text fontSize={12} color="$muted">
          {review.down_votes}
        </Text>
      </XStack>
    </YStack>
  );
}
