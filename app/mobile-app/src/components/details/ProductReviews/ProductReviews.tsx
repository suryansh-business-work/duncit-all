import { useEffect, useState } from 'react';
import { Button, Spinner, Text, TextArea, XStack, YStack } from 'tamagui';

import {
  CreateProductReviewDocument,
  ProductReviewsDocument,
  VoteProductReviewDocument,
} from '@/graphql/details';
import { graphqlRequest } from '@/services/graphql.client';
import { useMediaUpload } from '@/hooks/useMediaUpload';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useUploadSettings } from '@/hooks/useUploadSettings';
import { fireAndForget } from '@/utils/fire-and-forget';
import { useTranslation } from '@/hooks/useTranslation';
import { useLoadingRegion } from '@/components/Skeleton';

import { ReviewCard } from './ReviewCard';
import { ReviewPhotos } from './ReviewPhotos';
import { Stars } from './Stars';
import type { Review, Summary } from './types';

/** Ratings & reviews — the RN twin of mWeb's ProductReviews: summary, a write
 * form (stars + comment), the list with images + seller reply and thumbs voting. */
export function ProductReviews({ productId }: Readonly<{ productId: string }>) {
  const loadingRegion = useLoadingRegion();
  const { t } = useTranslation();
  const { color: ink, primary, accent, muted, danger } = useThemeColors();
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
          aria-label={t('mweb.common.shareYourExperienceOptional')}
          placeholderTextColor="$muted"
          minHeight={60}
        />
        <ReviewPhotos images={images} upload={upload} settings={settings} accent={accent} />
        {error ? (
          <Text role="alert" testID="review-error" color="$danger" fontSize={12}>
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
        <Spinner {...loadingRegion} testID="reviews-loading" color="$primary" />
      ) : null}
      {reviews.map((r) => (
        <ReviewCard
          key={r.id}
          review={r}
          ink={ink}
          accent={accent}
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
