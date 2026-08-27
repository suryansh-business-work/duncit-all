import { useEffect, useState } from 'react';
import { MaterialIcons } from '@expo/vector-icons';
import { Button, Spinner, Text, TextArea, XStack, YStack } from 'tamagui';

import { AppImage } from '@/components/AppImage';
import { MediaCropDialog } from '@/components/media-crop/MediaCropDialog';
import {
  CreateProductReviewDocument,
  ProductReviewsDocument,
  VoteProductReviewDocument,
} from '@/graphql/details';
import { graphqlRequest } from '@/services/graphql.client';
import { AiMonitoringChip } from '@/components/ai-monitoring';
import { useMediaUpload } from '@/hooks/useMediaUpload';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useUploadSettings, type MobileUploadSettings } from '@/hooks/useUploadSettings';
import { fireAndForget } from '@/utils/fire-and-forget';
import { useTranslation } from '@/hooks/useTranslation';
import { PRESS_STYLE } from '@duncit/buttons-native';

interface Review {
  id: string;
  user_name: string;
  rating: number;
  comment: string;
  images: string[];
  up_votes: number;
  down_votes: number;
  my_vote: number;
  seller_reply: string;
}
interface Summary {
  average_rating: number;
  total: number;
}

/** Tappable / read-only 5-star row. */
function Stars({
  value,
  onChange,
  size,
}: Readonly<{ value: number; onChange?: (n: number) => void; size: number }>) {
  return (
    <XStack gap={2}>
      {[1, 2, 3, 4, 5].map((n) => (
        <YStack
          pressStyle={PRESS_STYLE.surface}
          key={n}
          testID={onChange ? `star-${n}` : undefined}
          role={onChange ? 'button' : undefined}
          onPress={onChange ? () => onChange(n) : undefined}
        >
          <MaterialIcons name={n <= value ? 'star' : 'star-border'} size={size} color="#f5a623" />
        </YStack>
      ))}
    </XStack>
  );
}

type ReviewUpload = ReturnType<typeof useMediaUpload>;

/** Photo attachments for the write-review form: the staged thumbnails, the
 * picker trigger and the crop/upload dialog. */
function ReviewPhotos({
  images,
  upload,
  settings,
  primary,
}: Readonly<{
  images: string[];
  upload: ReviewUpload;
  settings: MobileUploadSettings | null;
  primary: string;
}>) {
  const uploadBusy = upload.uploading;
  return (
    <>
      {images.length > 0 ? (
        <XStack gap={6}>
          {images.map((u) => (
            <AppImage
              key={u}
              source={{ uri: u }}
              style={{ width: 56, height: 56, borderRadius: 8 }}
            />
          ))}
        </XStack>
      ) : null}
      <XStack
        pressStyle={PRESS_STYLE.surface}
        testID="review-add-photo"
        role="button"
        onPress={uploadBusy ? undefined : () => void upload.pick()}
        alignItems="center"
        gap={6}
        opacity={uploadBusy ? 0.6 : 1}
      >
        <MaterialIcons name="add-photo-alternate" size={18} color={primary} />
        <Text fontSize={13} fontWeight="700" color={primary}>
          {uploadBusy ? 'Uploading…' : 'Add photo'}
        </Text>
      </XStack>
      <XStack>
        <AiMonitoringChip testID="review-ai-monitoring" />
      </XStack>
      <MediaCropDialog
        media={upload.pending}
        settings={settings}
        uploading={upload.uploading}
        stage={upload.stage}
        progress={upload.progress}
        error={upload.error}
        onConfirm={upload.confirm}
        onCancel={upload.cancel}
      />
    </>
  );
}

/** One posted review — author + stars, comment, photos, the seller reply and
 * the thumbs-up/down vote row. */
function ReviewCard({
  review,
  ink,
  primary,
  muted,
  danger,
  onVote,
}: Readonly<{
  review: Review;
  ink: string;
  primary: string;
  muted: string;
  danger: string;
  onVote: (id: string, value: number, current: number) => void;
}>) {
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
              style={{ width: 56, height: 56, borderRadius: 8 }}
            />
          ))}
        </XStack>
      ) : null}
      {review.seller_reply ? (
        <YStack gap={2} padding={8} backgroundColor="$color2" borderRadius={8}>
          <Text fontSize={11} fontWeight="600" color={primary}>
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
          onPress={() => onVote(review.id, 1, review.my_vote)}
        >
          <MaterialIcons name="thumb-up" size={16} color={review.my_vote === 1 ? primary : muted} />
        </YStack>
        <Text fontSize={12} color="$muted">
          {review.up_votes}
        </Text>
        <YStack
          pressStyle={PRESS_STYLE.surface}
          testID={`review-down-${review.id}`}
          role="button"
          onPress={() => onVote(review.id, -1, review.my_vote)}
        >
          <MaterialIcons
            name="thumb-down"
            size={16}
            color={review.my_vote === -1 ? danger : muted}
          />
        </YStack>
        <Text fontSize={12} color="$muted">
          {review.down_votes}
        </Text>
      </XStack>
    </YStack>
  );
}

/** Ratings & reviews — the RN twin of mWeb's ProductReviews: summary, a write
 * form (stars + comment), the list with images + seller reply and thumbs voting. */
export function ProductReviews({ productId }: Readonly<{ productId: string }>) {
  const { t } = useTranslation();
  const { color: ink, primary, muted, danger } = useThemeColors();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(false);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const settings = useUploadSettings();
  const upload = useMediaUpload('/product-reviews', (url) => setImages((prev) => [...prev, url]));

  const load = () => {
    setLoading(true);
    return graphqlRequest(ProductReviewsDocument, { id: productId }, { auth: true })
      .then((d) => {
        setSummary(d.productReviewSummary);
        setReviews(d.productReviews as Review[]);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fireAndForget(load());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productId]);

  const submit = async () => {
    if (!rating) {
      setError(t('mweb.common.pleasePickAStarRating'));
      return;
    }
    setError('');
    setSaving(true);
    try {
      await graphqlRequest(
        CreateProductReviewDocument,
        { input: { product_id: productId, rating, comment: comment.trim(), images } },
        { auth: true },
      );
      setComment('');
      setImages([]);
      await load();
    } catch {
      setError(t('mweb.common.couldNotSubmitYourReview'));
    } finally {
      setSaving(false);
    }
  };

  const vote = (id: string, value: number, current: number) =>
    fireAndForget(
      graphqlRequest(
        VoteProductReviewDocument,
        { review_id: id, vote: current === value ? 0 : value },
        { auth: true },
      ).then(() => load()),
    );

  return (
    <YStack gap={12} testID="product-reviews">
      <Text fontSize={16} fontWeight="700" color={ink}>
        Ratings & reviews
      </Text>
      {summary && summary.total > 0 ? (
        <XStack gap={6} alignItems="center">
          <Stars value={Math.round(summary.average_rating)} size={14} />
          <Text fontSize={13} color="$muted">
            {summary.average_rating} · {summary.total} review{summary.total === 1 ? '' : 's'}
          </Text>
        </XStack>
      ) : null}

      <YStack gap={8} padding={12} borderWidth={1} borderColor="$borderColor" borderRadius={12}>
        <Text fontSize={13} fontWeight="600" color={ink}>
          Write a review
        </Text>
        <Stars value={rating} onChange={setRating} size={26} />
        <TextArea
          testID="review-comment"
          value={comment}
          onChangeText={setComment}
          placeholder={t('mweb.common.shareYourExperienceOptional')}
          placeholderTextColor="$muted"
          minHeight={60}
        />
        <ReviewPhotos images={images} upload={upload} settings={settings} primary={primary} />
        {error ? (
          <Text testID="review-error" color="$danger" fontSize={12}>
            {error}
          </Text>
        ) : null}
        <Button
          testID="review-submit"
          onPress={submit}
          disabled={saving}
          backgroundColor={primary}
          color="white"
          fontWeight="600"
        >
          {saving ? 'Submitting…' : 'Submit review'}
        </Button>
      </YStack>

      {loading && reviews.length === 0 ? (
        <Spinner testID="reviews-loading" color="$primary" />
      ) : null}
      {reviews.map((r) => (
        <ReviewCard
          key={r.id}
          review={r}
          ink={ink}
          primary={primary}
          muted={muted}
          danger={danger}
          onVote={vote}
        />
      ))}
      {!loading && reviews.length === 0 ? (
        <Text fontSize={13} color="$muted">
          No reviews yet — be the first!
        </Text>
      ) : null}
    </YStack>
  );
}
