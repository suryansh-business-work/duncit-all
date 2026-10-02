import { useRef, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { CircularProgress, Divider, Rating, Stack, Typography } from '@mui/material';
import { useImagekitUpload } from '../../../utils/imagekit';
import { CREATE_PRODUCT_REVIEW, PRODUCT_REVIEWS, VOTE_PRODUCT_REVIEW } from '../queries';
import { useTranslation } from '../../../i18n/useTranslation';
import ReviewCard from './ReviewCard';
import ReviewWriteForm from './ReviewWriteForm';
import type { Review } from './types';

/** Ratings & reviews for a product — summary, the viewer's write form (stars +
 * comment), the review list with thumbs up/down and the seller's reply. */
export default function ProductReviews({ productId }: Readonly<{ productId: string }>) {
  const { t } = useTranslation();
  const { data, loading, refetch } = useQuery<any>(PRODUCT_REVIEWS, {
    variables: { id: productId },
    fetchPolicy: 'cache-and-network',
  });
  const [createReview, { loading: saving }] = useMutation<any>(CREATE_PRODUCT_REVIEW);
  const [voteReview] = useMutation<any>(VOTE_PRODUCT_REVIEW);
  const { upload, uploading } = useImagekitUpload();
  const [rating, setRating] = useState<number | null>(0);
  const [comment, setComment] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const summary = data?.productReviewSummary;
  const reviews: Review[] = data?.productReviews ?? [];

  const onPickImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (fileRef.current) fileRef.current.value = '';
    if (!file) return;
    try {
      const url = await upload(file, '/product-reviews');
      setImages((prev) => [...prev, url]);
    } catch {
      setError(t('mweb.podDetails.couldNotUploadTheImage'));
    }
  };

  const submit = async () => {
    if (!rating) {
      setError(t('mweb.common.pleasePickAStarRating'));
      return;
    }
    setError(null);
    try {
      await createReview({
        variables: { input: { product_id: productId, rating, comment: comment.trim(), images } },
      });
      setComment('');
      setImages([]);
      await refetch();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('mweb.common.couldNotSubmitYourReview'));
    }
  };

  const removeImage = (url: string) => setImages((prev) => prev.filter((u) => u !== url));

  const vote = (id: string, value: number, current: number) =>
    voteReview({ variables: { review_id: id, vote: current === value ? 0 : value } })
      .then(() => refetch())
      .catch(() => undefined);

  return (
    <Stack spacing={1.5} data-testid="product-reviews">
      <Divider />
      <Typography variant="subtitle1" sx={{
        fontWeight: 600
      }}>
        Ratings &amp; reviews
      </Typography>
      {summary && summary.total > 0 && (
        <Stack direction="row" spacing={1} data-testid="review-summary" sx={{
          alignItems: "center"
        }}>
          <Rating
            value={summary.average_rating}
            precision={0.1}
            readOnly
            size="small"
            getLabelText={(value) => t('mweb.a11y.starRating', { vars: { rating: value } })}
          />
          <Typography variant="body2" sx={{
            color: "text.secondary"
          }}>
            {summary.average_rating} · {summary.total} review{summary.total === 1 ? '' : 's'}
          </Typography>
        </Stack>
      )}

      <ReviewWriteForm
        rating={rating}
        setRating={setRating}
        comment={comment}
        setComment={setComment}
        images={images}
        removeImage={removeImage}
        fileRef={fileRef}
        uploading={uploading}
        onPickImage={onPickImage}
        error={error}
        saving={saving}
        submit={submit}
      />

      {loading && !data ? (
        <Stack
          data-testid="reviews-loading"
          sx={{
            alignItems: "center",
            py: 2
          }}>
          <CircularProgress aria-label={t('mweb.a11y.loading')} size={22} />
        </Stack>
      ) : null}
      {reviews.map((r) => (
        <ReviewCard key={r.id} r={r} vote={vote} />
      ))}
      {!loading && reviews.length === 0 && (
        <Typography variant="body2" data-testid="product-reviews-empty" sx={{
          color: "text.secondary"
        }}>
          No reviews yet — be the first!
        </Typography>
      )}
    </Stack>
  );
}
