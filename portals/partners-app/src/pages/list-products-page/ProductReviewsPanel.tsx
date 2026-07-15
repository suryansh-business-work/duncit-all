import { useState } from 'react';
import { gql, useMutation, useQuery } from '@apollo/client';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  Rating,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ThumbUpAltIcon from '@mui/icons-material/ThumbUpAlt';
import ThumbDownAltIcon from '@mui/icons-material/ThumbDownAlt';

const PRODUCT_REVIEWS = gql`
  query PartnerProductReviews($id: ID!) {
    productReviewSummary(product_id: $id) {
      average_rating
      total
    }
    productReviews(product_id: $id) {
      id
      user_name
      rating
      comment
      images
      up_votes
      down_votes
      seller_reply
    }
  }
`;

const REPLY_TO_REVIEW = gql`
  mutation ReplyToProductReview($review_id: ID!, $reply: String!) {
    replyToProductReview(review_id: $review_id, reply: $reply) {
      id
      seller_reply
    }
  }
`;

interface Review {
  id: string;
  user_name: string;
  rating: number;
  comment: string;
  images: string[];
  up_votes: number;
  down_votes: number;
  seller_reply: string;
}

function ReviewRow({
  review,
  onReply,
}: Readonly<{ review: Review; onReply: (id: string, reply: string) => Promise<void> }>) {
  const [reply, setReply] = useState(review.seller_reply || '');
  const [saving, setSaving] = useState(false);
  const submit = async () => {
    setSaving(true);
    try {
      await onReply(review.id, reply.trim());
    } finally {
      setSaving(false);
    }
  };
  return (
    <Box sx={{ py: 1.5 }}>
      <Stack direction="row" spacing={1} alignItems="center">
        <Typography fontWeight={800}>{review.user_name}</Typography>
        <Rating value={review.rating} readOnly size="small" />
      </Stack>
      {review.comment && (
        <Typography variant="body2" sx={{ mt: 0.5 }}>
          {review.comment}
        </Typography>
      )}
      {review.images.length > 0 && (
        <Stack direction="row" spacing={1} sx={{ mt: 0.5, overflowX: 'auto' }}>
          {review.images.map((u) => (
            <Box
              key={u}
              component="img"
              src={u}
              alt="Review"
              sx={{ width: 56, height: 56, borderRadius: 1, objectFit: 'cover' }}
            />
          ))}
        </Stack>
      )}
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5, color: 'text.secondary' }}>
        <ThumbUpAltIcon sx={{ fontSize: 15 }} />
        <Typography variant="caption">{review.up_votes}</Typography>
        <ThumbDownAltIcon sx={{ fontSize: 15 }} />
        <Typography variant="caption">{review.down_votes}</Typography>
      </Stack>
      <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
        <TextField
          size="small"
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder="Reply to this review"
          fullWidth
        />
        <Button variant="outlined" onClick={submit} disabled={saving || !reply.trim()}>
          {review.seller_reply ? 'Update' : 'Reply'}
        </Button>
      </Stack>
    </Box>
  );
}

/** Seller view of a product's reviews with a reply box per review. */
export default function ProductReviewsPanel({ productId }: Readonly<{ productId: string }>) {
  const { data, loading, refetch } = useQuery(PRODUCT_REVIEWS, {
    variables: { id: productId },
    fetchPolicy: 'cache-and-network',
  });
  const [replyMut] = useMutation(REPLY_TO_REVIEW);
  const [error, setError] = useState<string | null>(null);
  const reviews: Review[] = data?.productReviews ?? [];
  const summary = data?.productReviewSummary;

  const onReply = async (reviewId: string, reply: string) => {
    setError(null);
    try {
      await replyMut({ variables: { review_id: reviewId, reply } });
      await refetch();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save your reply.');
    }
  };

  return (
    <Box sx={{ p: 2.5, borderRadius: 2, border: 1, borderColor: 'divider' }}>
      <Typography variant="h6" fontWeight={900}>
        Ratings &amp; reviews
      </Typography>
      {summary && summary.total > 0 && (
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
          <Rating value={summary.average_rating} precision={0.1} readOnly size="small" />
          <Typography variant="body2" color="text.secondary">
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
        <Stack alignItems="center" sx={{ py: 2 }}>
          <CircularProgress size={22} />
        </Stack>
      ) : null}
      {reviews.map((r, index) => (
        <Box key={r.id}>
          {index > 0 && <Divider />}
          <ReviewRow review={r} onReply={onReply} />
        </Box>
      ))}
      {!loading && reviews.length === 0 && (
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          No reviews yet for this product.
        </Typography>
      )}
    </Box>
  );
}
