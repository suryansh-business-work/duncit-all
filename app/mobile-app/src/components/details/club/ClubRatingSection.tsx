import { useEffect, useState } from 'react';
import { Modal, TouchableOpacity } from 'react-native';
import { Text, XStack, YStack } from 'tamagui';
import { MaterialIcons } from '@expo/vector-icons';

import { DuncitButton } from '@/components/DuncitButton';
import { SurfaceCard } from '@/components/SurfaceCard';
import { graphqlRequest } from '@/services/graphql.client';
import { ClubRatingsDocument, AddClubRatingDocument } from '@/graphql/details';
import { useBottomInset } from '@/hooks/useBottomNavSpace';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useTranslation } from '@/hooks/useTranslation';
import { fireAndForget } from '@/utils/fire-and-forget';
import { ReviewRow, StarPicker, StarRow, type ClubRating } from './ClubRatingParts';

interface Props {
  clubId: string;
  rating: number;
  ratingsCount: number;
}

/** Ratings & Reviews on a surface card: the average, the latest three reviews
 * and the Rate Club sheet. mWeb twin: club-details-page/ClubRatingSection. */
export function ClubRatingSection({ clubId, rating, ratingsCount }: Readonly<Props>) {
  const { t } = useTranslation();
  const { muted } = useThemeColors();
  // The rate sheet is flush to the bottom edge the Android navigation bar paints
  // over — without this the Submit button sits under it.
  const bottomInset = useBottomInset();
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
    <SurfaceCard gap={12} testID="club-ratings">
      <XStack alignItems="center" justifyContent="space-between">
        <Text fontSize={17} fontWeight="600" color="$color">
          Ratings & Reviews
        </Text>
        <TouchableOpacity onPress={() => setDialogOpen(true)} accessibilityLabel="Rate this club">
          <XStack
            height={32}
            paddingHorizontal={14}
            alignItems="center"
            borderRadius={999}
            backgroundColor="$soft"
          >
            <Text fontSize={13} fontWeight="600" color="$color">
              Rate Club
            </Text>
          </XStack>
        </TouchableOpacity>
      </XStack>

      {currentCount > 0 ? (
        <XStack alignItems="center" gap={12}>
          <Text fontSize={34} fontWeight="600" color="$color">
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
        <Text fontSize={14} color="$muted">
          No ratings yet. Be the first to review!
        </Text>
      )}

      {preview.map((r) => (
        <ReviewRow key={r.id} review={r} />
      ))}

      {/* Rate sheet */}
      <Modal visible={dialogOpen} animationType="slide" transparent>
        <YStack flex={1} backgroundColor="rgba(0,0,0,0.5)" justifyContent="flex-end">
          <YStack
            backgroundColor="$surface"
            borderTopLeftRadius={28}
            borderTopRightRadius={28}
            padding={24}
            paddingBottom={24 + bottomInset}
            gap={16}
          >
            <XStack alignItems="center" justifyContent="space-between">
              <Text fontSize={17} fontWeight="600" color="$color">
                {t('mweb.clubDetails.rateThisClub')}
              </Text>
              <TouchableOpacity testID="rating-dialog-close" onPress={() => setDialogOpen(false)}>
                <MaterialIcons name="close" size={22} color={muted} />
              </TouchableOpacity>
            </XStack>
            <YStack gap={8}>
              <Text fontSize={14} fontWeight="600" color="$color">
                Your rating
              </Text>
              <StarPicker value={stars} onChange={setStars} />
            </YStack>
            <YStack gap={6}>
              <Text fontSize={14} fontWeight="600" color="$color">
                {t('mweb.clubDetails.commentOptional')}
              </Text>
              <XStack
                borderWidth={1}
                borderColor="$borderColor"
                borderRadius={14}
                padding={12}
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
            <DuncitButton
              fullWidth
              size="lg"
              label={submitting ? 'Submitting…' : 'Submit Rating'}
              disabled={stars === 0 || submitting}
              onPress={() => fireAndForget(handleSubmit())}
            />
          </YStack>
        </YStack>
      </Modal>
    </SurfaceCard>
  );
}
