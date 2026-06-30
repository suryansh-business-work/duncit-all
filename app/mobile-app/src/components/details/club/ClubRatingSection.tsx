import { useEffect, useState } from 'react';
import { Modal, TouchableOpacity } from 'react-native';
import { Avatar, AvatarImage } from 'tamagui';
import { Text, XStack, YStack } from 'tamagui';
import { MaterialIcons } from '@expo/vector-icons';
import { format } from 'date-fns';

import { graphqlRequest } from '@/services/graphql.client';
import { ClubRatingsDocument, AddClubRatingDocument } from '@/graphql/details';
import { useThemeColors } from '@/hooks/useThemeColors';

interface ClubRating {
  id: string;
  user_id: string;
  user_name: string | null | undefined;
  user_photo: string | null | undefined;
  stars: number;
  comment: string | null | undefined;
  created_at: string;
}

interface Props {
  clubId: string;
  rating: number;
  ratingsCount: number;
}

function StarRow({ value, size = 16 }: Readonly<{ value: number; size?: number }>) {
  const { primary } = useThemeColors();
  return (
    <XStack gap={2}>
      {[1, 2, 3, 4, 5].map((s) => (
        <MaterialIcons
          key={s}
          name={s <= Math.round(value) ? 'star' : 'star-border'}
          size={size}
          color={primary}
        />
      ))}
    </XStack>
  );
}

function StarPicker({
  value,
  onChange,
}: Readonly<{ value: number; onChange: (v: number) => void }>) {
  const { primary } = useThemeColors();
  return (
    <XStack gap={4}>
      {[1, 2, 3, 4, 5].map((s) => (
        <TouchableOpacity
          key={s}
          testID={`star-${s}`}
          onPress={() => onChange(s)}
          hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
        >
          <MaterialIcons name={s <= value ? 'star' : 'star-border'} size={32} color={primary} />
        </TouchableOpacity>
      ))}
    </XStack>
  );
}

export function ClubRatingSection({ clubId, rating, ratingsCount }: Readonly<Props>) {
  const { primary } = useThemeColors();
  const [reviews, setReviews] = useState<ClubRating[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [currentRating, setCurrentRating] = useState(rating);
  const [currentCount, setCurrentCount] = useState(ratingsCount);

  useEffect(() => {
    if (!clubId) return;
    graphqlRequest(ClubRatingsDocument, { clubId }, { auth: false })
      .then((r) => setReviews(r.clubRatings as ClubRating[]))
      /* istanbul ignore next */
      .catch(() => null);
  }, [clubId]);

  const handleSubmit = async () => {
    /* istanbul ignore next */
    if (stars === 0 || submitting) return;
    setSubmitting(true);
    try {
      const result = await graphqlRequest(
        AddClubRatingDocument,
        { clubId, stars, comment: comment.trim() || undefined },
        { auth: true },
      );
      setCurrentRating(result.addClubRating.rating);
      setCurrentCount(result.addClubRating.ratings_count);
      setDialogOpen(false);
      setStars(0);
      setComment('');
      // Refresh ratings list
      graphqlRequest(ClubRatingsDocument, { clubId }, { auth: false })
        .then((r) => setReviews(r.clubRatings as ClubRating[]))
        /* istanbul ignore next */
        .catch(() => null);
    } finally {
      setSubmitting(false);
    }
  };

  const preview = reviews.slice(0, 3);

  return (
    <YStack gap={12} testID="club-ratings">
      <XStack alignItems="center" justifyContent="space-between">
        <Text fontSize={16} fontWeight="900" color="$color">
          Ratings & Reviews
        </Text>
        <TouchableOpacity onPress={() => setDialogOpen(true)} accessibilityLabel="Rate this club">
          <XStack
            paddingHorizontal={12}
            paddingVertical={6}
            borderRadius={12}
            borderWidth={1}
            borderColor={primary}
          >
            <Text fontSize={12} fontWeight="800" color={primary}>
              Rate Club
            </Text>
          </XStack>
        </TouchableOpacity>
      </XStack>

      {currentCount > 0 ? (
        <XStack alignItems="center" gap={12}>
          <Text fontSize={36} fontWeight="900" color="$color">
            {currentRating.toFixed(1)}
          </Text>
          <YStack gap={4}>
            <StarRow value={currentRating} />
            <Text fontSize={12} color="$muted">
              {currentCount} ratings
            </Text>
          </YStack>
        </XStack>
      ) : (
        <Text fontSize={13} color="$muted">
          No ratings yet. Be the first to review!
        </Text>
      )}

      {preview.map((r) => (
        <YStack
          key={r.id}
          gap={4}
          paddingVertical={8}
          borderTopWidth={1}
          borderColor="$borderColor"
        >
          <XStack alignItems="center" gap={10}>
            <Avatar circular size={32}>
              <AvatarImage src={r.user_photo ?? undefined} />
            </Avatar>
            <YStack flex={1}>
              <Text fontSize={13} fontWeight="700" color="$color">
                {r.user_name ?? 'Member'}
              </Text>
              <XStack alignItems="center" gap={6}>
                <StarRow value={r.stars} size={13} />
                <Text fontSize={11} color="$muted">
                  {format(new Date(r.created_at), 'MMM d, yyyy')}
                </Text>
              </XStack>
            </YStack>
          </XStack>
          {r.comment ? (
            <Text fontSize={13} color="$muted" numberOfLines={3}>
              {r.comment}
            </Text>
          ) : null}
        </YStack>
      ))}

      {/* Rate dialog */}
      <Modal visible={dialogOpen} animationType="slide" transparent>
        <YStack flex={1} backgroundColor="rgba(0,0,0,0.5)" justifyContent="flex-end">
          <YStack
            backgroundColor="$background"
            borderTopLeftRadius={20}
            borderTopRightRadius={20}
            padding={24}
            gap={16}
          >
            <XStack alignItems="center" justifyContent="space-between">
              <Text fontSize={17} fontWeight="900" color="$color">
                Rate this Club
              </Text>
              <TouchableOpacity testID="rating-dialog-close" onPress={() => setDialogOpen(false)}>
                <MaterialIcons name="close" size={22} color="gray" />
              </TouchableOpacity>
            </XStack>
            <YStack gap={8}>
              <Text fontSize={14} fontWeight="700" color="$color">
                Your rating
              </Text>
              <StarPicker value={stars} onChange={setStars} />
            </YStack>
            <YStack gap={6}>
              <Text fontSize={14} fontWeight="700" color="$color">
                Comment (optional)
              </Text>
              <XStack
                borderWidth={1}
                borderColor="$borderColor"
                borderRadius={12}
                padding={10}
                minHeight={80}
                alignItems="flex-start"
              >
                <Text
                  fontSize={14}
                  color={
                    /* istanbul ignore next */
                    comment ? '$color' : '$muted'
                  }
                >
                  {comment || 'Share your experience…'}
                </Text>
              </XStack>
            </YStack>
            <TouchableOpacity
              onPress={() => void handleSubmit()}
              disabled={stars === 0 || submitting}
            >
              <XStack
                height={48}
                borderRadius={14}
                backgroundColor={stars === 0 || submitting ? '$muted' : primary}
                alignItems="center"
                justifyContent="center"
              >
                <Text fontSize={15} fontWeight="900" color="white">
                  {submitting ? 'Submitting…' : 'Submit Rating'}
                </Text>
              </XStack>
            </TouchableOpacity>
          </YStack>
        </YStack>
      </Modal>
    </YStack>
  );
}
