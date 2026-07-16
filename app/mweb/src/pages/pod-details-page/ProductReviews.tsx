import { useRef, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  Alert,
  Avatar,
  Box,
  Button,
  CircularProgress,
  Divider,
  IconButton,
  Rating,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import ThumbUpOffAltIcon from '@mui/icons-material/ThumbUpOffAlt';
import ThumbDownOffAltIcon from '@mui/icons-material/ThumbDownOffAlt';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import CloseIcon from '@mui/icons-material/Close';
import { useImagekitUpload } from '../../utils/imagekit';
import { CREATE_PRODUCT_REVIEW, PRODUCT_REVIEWS, VOTE_PRODUCT_REVIEW } from './queries';

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
  seller_reply_at: string | null;
  created_at: string;
}

/** Ratings & reviews for a product — summary, the viewer's write form (stars +
 * comment), the review list with thumbs up/down and the seller's reply. */
export default function ProductReviews({ productId }: Readonly<{ productId: string }>) {
  const { data, loading, refetch } = useQuery(PRODUCT_REVIEWS, {
    variables: { id: productId },
    fetchPolicy: 'cache-and-network',
  });
  const [createReview, { loading: saving }] = useMutation(CREATE_PRODUCT_REVIEW);
  const [voteReview] = useMutation(VOTE_PRODUCT_REVIEW);
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
      setError('Could not upload the image.');
    }
  };

  const submit = async () => {
    if (!rating) {
      setError('Please pick a star rating.');
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
      setError(e instanceof Error ? e.message : 'Could not submit your review.');
    }
  };

  const removeImage = (url: string) => setImages((prev) => prev.filter((u) => u !== url));

  const vote = (id: string, value: number, current: number) =>
    voteReview({ variables: { review_id: id, vote: current === value ? 0 : value } })
      .then(() => refetch())
      .catch(() => undefined);

  return (
    <Stack spacing={1.5}>
      <Divider />
      <Typography variant="subtitle1" fontWeight={900}>
        Ratings &amp; reviews
      </Typography>
      {summary && summary.total > 0 && (
        <Stack direction="row" spacing={1} alignItems="center">
          <Rating value={summary.average_rating} precision={0.1} readOnly size="small" />
          <Typography variant="body2" color="text.secondary">
            {summary.average_rating} · {summary.total} review{summary.total === 1 ? '' : 's'}
          </Typography>
        </Stack>
      )}

      <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 2, p: 1.5 }}>
        <Typography variant="body2" fontWeight={800} sx={{ mb: 0.5 }}>
          Write a review
        </Typography>
        <Rating value={rating} onChange={(_, v) => setRating(v)} />
        <TextField
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Share your experience (optional)"
          multiline
          minRows={2}
          fullWidth
          size="small"
          sx={{ mt: 1 }}
        />
        {images.length > 0 && (
          <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap' }} useFlexGap>
            {images.map((url) => (
              <Box key={url} sx={{ position: 'relative' }}>
                <Box
                  component="img"
                  src={url}
                  alt="Review"
                  sx={{ width: 56, height: 56, borderRadius: 1, objectFit: 'cover' }}
                />
                <IconButton
                  size="small"
                  onClick={() => removeImage(url)}
                  sx={{ position: 'absolute', top: -8, right: -8, bgcolor: 'background.paper', boxShadow: 1 }}
                >
                  <CloseIcon sx={{ fontSize: 14 }} />
                </IconButton>
              </Box>
            ))}
          </Stack>
        )}
        <Button
          size="small"
          startIcon={<AddPhotoAlternateIcon />}
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          sx={{ mt: 1 }}
        >
          {uploading ? 'Uploading…' : 'Add photo'}
        </Button>
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPickImage} />
        {error && (
          <Alert severity="warning" sx={{ mt: 1 }}>
            {error}
          </Alert>
        )}
        <Button
          variant="contained"
          size="small"
          onClick={submit}
          disabled={saving}
          sx={{ mt: 1, borderRadius: 999, fontWeight: 800 }}
        >
          {saving ? 'Submitting…' : 'Submit review'}
        </Button>
      </Box>

      {loading && !data ? (
        <Stack alignItems="center" sx={{ py: 2 }}>
          <CircularProgress size={22} />
        </Stack>
      ) : null}
      {reviews.map((r) => (
        <Box key={r.id} sx={{ borderTop: 1, borderColor: 'divider', pt: 1.25 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <Avatar sx={{ width: 28, height: 28, fontSize: 13 }}>{(r.user_name[0] ?? 'U').toUpperCase()}</Avatar>
            <Typography variant="body2" fontWeight={800}>
              {r.user_name}
            </Typography>
            <Rating value={r.rating} readOnly size="small" />
          </Stack>
          {r.comment && (
            <Typography variant="body2" sx={{ mt: 0.5, whiteSpace: 'pre-wrap' }}>
              {r.comment}
            </Typography>
          )}
          {r.images.length > 0 && (
            <Stack direction="row" spacing={1} sx={{ mt: 0.5, overflowX: 'auto' }}>
              {r.images.map((url) => (
                <Box
                  key={url}
                  component="img"
                  src={url}
                  alt="Review"
                  sx={{ width: 64, height: 64, borderRadius: 1, objectFit: 'cover' }}
                />
              ))}
            </Stack>
          )}
          {r.seller_reply && (
            <Box sx={{ mt: 0.75, ml: 2, p: 1, bgcolor: 'action.hover', borderRadius: 1.5 }}>
              <Typography variant="caption" fontWeight={800} color="primary.main">
                Seller response
              </Typography>
              <Typography variant="body2">{r.seller_reply}</Typography>
            </Box>
          )}
          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.5 }}>
            <IconButton size="small" color={r.my_vote === 1 ? 'primary' : 'default'} onClick={() => vote(r.id, 1, r.my_vote)}>
              <ThumbUpOffAltIcon fontSize="small" />
            </IconButton>
            <Typography variant="caption">{r.up_votes}</Typography>
            <IconButton size="small" color={r.my_vote === -1 ? 'error' : 'default'} onClick={() => vote(r.id, -1, r.my_vote)}>
              <ThumbDownOffAltIcon fontSize="small" />
            </IconButton>
            <Typography variant="caption">{r.down_votes}</Typography>
          </Stack>
        </Box>
      ))}
      {!loading && reviews.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          No reviews yet — be the first!
        </Typography>
      )}
    </Stack>
  );
}
