import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import {
  Alert,
  Box,
  CircularProgress,
  Divider,
  Rating,
  Stack,
  Typography,
} from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { PRODUCT_REVIEWS, REPLY_TO_REVIEW, type Review } from './queries';
import ReviewRow from './ReviewRow';

/** Seller view of a product's reviews with a reply box per review. */
export default function ProductReviewsPanel({ productId }: Readonly<{ productId: string }>) {
  const { t } = useTranslation();
  const { data, loading, refetch } = useQuery<any>(PRODUCT_REVIEWS, {
    variables: { id: productId },
    fetchPolicy: 'cache-and-network',
  });
  const [replyMut] = useMutation<any>(REPLY_TO_REVIEW);
  const [error, setError] = useState<string | null>(null);
  const reviews: Review[] = data?.productReviews ?? [];
  const summary = data?.productReviewSummary;

  const onReply = async (reviewId: string, reply: string) => {
    setError(null);
    try {
      await replyMut({ variables: { review_id: reviewId, reply } });
      await refetch();
    } catch (e) {
      setError(e instanceof Error ? e.message : t('partners.listProductsPage.couldNotSaveYourReply'));
    }
  };

  return (
    <Box sx={{ p: 2.5, borderRadius: 2, border: 1, borderColor: 'divider' }}>
      <Typography variant="h6" component="h2" sx={{
        fontWeight: 900
      }}>
        Ratings &amp; reviews
      </Typography>
      {summary && summary.total > 0 && (
        <Stack
          direction="row"
          spacing={1}
          sx={{
            alignItems: "center",
            mt: 0.5
          }}>
          <Rating value={summary.average_rating} precision={0.1} readOnly size="small" />
          <Typography variant="body2" sx={{
            color: "text.secondary"
          }}>
            {summary.average_rating} · {summary.total} review{summary.total === 1 ? '' : 's'}
          </Typography>
        </Stack>
      )}
      {error && (
        <Alert severity="error" sx={{ mt: 1 }}>
          {error}
        </Alert>
      )}
      {loading && !data ? (
        <Stack
          sx={{
            alignItems: "center",
            py: 2
          }}>
          <CircularProgress size={22} aria-label={t('shell.a11y.loading')} />
        </Stack>
      ) : null}
      {reviews.map((r, index) => (
        <Box key={r.id}>
          {index > 0 && <Divider />}
          <ReviewRow review={r} onReply={onReply} />
        </Box>
      ))}
      {!loading && reviews.length === 0 && (
        <Typography
          variant="body2"
          sx={{
            color: "text.secondary",
            mt: 1
          }}>
          No reviews yet for this product.
        </Typography>
      )}
    </Box>
  );
}
