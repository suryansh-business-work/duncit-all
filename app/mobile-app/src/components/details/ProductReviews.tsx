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
import { useMediaUpload } from '@/hooks/useMediaUpload';
import { useThemeColors } from '@/hooks/useThemeColors';
import { useUploadSettings } from '@/hooks/useUploadSettings';
import { fireAndForget } from '@/utils/fire-and-forget';

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

const MUTED = '#9aa0a6';
const DOWN = '#e5484d';

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

/** Ratings & reviews — the RN twin of mWeb's ProductReviews: summary, a write
 * form (stars + comment), the list with images + seller reply and thumbs voting. */
export function ProductReviews({ productId }: Readonly<{ productId: string }>) {
  const { color: ink, primary } = useThemeColors();
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
  const uploadBusy = upload.uploading;

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
      setError('Please pick a star rating.');
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
      setError('Could not submit your review.');
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
      <Text fontSize={16} fontWeight="900" color={ink}>
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
        <Text fontSize={13} fontWeight="800" color={ink}>
          Write a review
        </Text>
        <Stars value={rating} onChange={setRating} size={26} />
        <TextArea
          testID="review-comment"
          value={comment}
          onChangeText={setComment}
          placeholder="Share your experience (optional)"
          minHeight={60}
        />
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
          fontWeight="800"
        >
          {saving ? 'Submitting…' : 'Submit review'}
        </Button>
      </YStack>

      {loading && reviews.length === 0 ? (
        <Spinner testID="reviews-loading" color="$primary" />
      ) : null}
      {reviews.map((r) => (
        <YStack key={r.id} gap={4} paddingTop={10} borderTopWidth={1} borderColor="$borderColor">
          <XStack gap={6} alignItems="center">
            <Text fontSize={13} fontWeight="800" color={ink}>
              {r.user_name}
            </Text>
            <Stars value={r.rating} size={14} />
          </XStack>
          {r.comment ? (
            <Text fontSize={13} color={ink}>
              {r.comment}
            </Text>
          ) : null}
          {r.images.length > 0 ? (
            <XStack gap={6}>
              {r.images.map((u) => (
                <AppImage
                  key={u}
                  source={{ uri: u }}
                  style={{ width: 56, height: 56, borderRadius: 8 }}
                />
              ))}
            </XStack>
          ) : null}
          {r.seller_reply ? (
            <YStack gap={2} padding={8} backgroundColor="$color2" borderRadius={8}>
              <Text fontSize={11} fontWeight="800" color={primary}>
                Seller response
              </Text>
              <Text fontSize={13} color={ink}>
                {r.seller_reply}
              </Text>
            </YStack>
          ) : null}
          <XStack gap={4} alignItems="center">
            <YStack
              testID={`review-up-${r.id}`}
              role="button"
              onPress={() => vote(r.id, 1, r.my_vote)}
            >
              <MaterialIcons name="thumb-up" size={16} color={r.my_vote === 1 ? primary : MUTED} />
            </YStack>
            <Text fontSize={12} color="$muted">
              {r.up_votes}
            </Text>
            <YStack
              testID={`review-down-${r.id}`}
              role="button"
              onPress={() => vote(r.id, -1, r.my_vote)}
            >
              <MaterialIcons name="thumb-down" size={16} color={r.my_vote === -1 ? DOWN : MUTED} />
            </YStack>
            <Text fontSize={12} color="$muted">
              {r.down_votes}
            </Text>
          </XStack>
        </YStack>
      ))}
      {!loading && reviews.length === 0 ? (
        <Text fontSize={13} color="$muted">
          No reviews yet — be the first!
        </Text>
      ) : null}
    </YStack>
  );
}
