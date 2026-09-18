import { useQuery } from '@apollo/client/react';
import { LinearProgress, Paper, Rating, Stack, Typography } from '@mui/material';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import { useDateFormat } from '@duncit/app-settings';
import { DuncitButton } from '@duncit/buttons';

import { useStoreSession } from '../../../app/providers/SessionProvider';
import { PRODUCT_REVIEWS, type ProductReview, type StoreProduct } from '../../../graphql/product';
import { useStoreT } from '../../../i18n';
import { STORE_TOKENS as T } from '../../../theme/tokens';
import { ReviewForm } from '../review-form';

const STARS = [5, 4, 3, 2, 1] as const;

/** Average, count and one bar per star (star_counts: index 0 = 1★ … 4 = 5★). */
function StarBars({ product }: Readonly<{ product: StoreProduct }>) {
  const { t } = useStoreT();
  const total = product.star_counts.reduce((sum, n) => sum + n, 0);
  return (
    <Stack spacing={0.75} sx={{ minWidth: 240 }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <Typography sx={{ fontSize: '2.5rem', fontWeight: 800 }}>{product.rating.toFixed(1)}</Typography>
        <Stack>
          <Rating value={product.rating} precision={0.5} readOnly aria-hidden />
          <Typography variant="body2" color="text.secondary">
            {t('ecommStore.reviews.count', { count: product.rating_count })}
          </Typography>
        </Stack>
      </Stack>
      {STARS.map((star) => {
        const count = product.star_counts[star - 1] ?? 0;
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        return (
          <Stack key={star} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <Stack direction="row" sx={{ alignItems: 'center', width: 32 }} aria-hidden>
              <Typography variant="body2">{star}</Typography>
              <StarRoundedIcon sx={{ fontSize: 14 }} />
            </Stack>
            <LinearProgress
              variant="determinate"
              value={pct}
              aria-label={t('ecommStore.reviews.starShare', { vars: { star, count } })}
              sx={{ flexGrow: 1, height: 8, borderRadius: 4, bgcolor: T.border, '& .MuiLinearProgress-bar': { bgcolor: T.brand } }}
            />
            <Typography variant="caption" sx={{ width: 32, textAlign: 'right' }}>
              {count}
            </Typography>
          </Stack>
        );
      })}
    </Stack>
  );
}

function ReviewItem({ review }: Readonly<{ review: ProductReview }>) {
  const { t } = useStoreT();
  const { formatDate } = useDateFormat();
  return (
    <Paper component="li" sx={{ p: 2, listStyle: 'none' }}>
      <Stack spacing={0.75}>
        <Stack direction="row" spacing={1} sx={{ justifyContent: 'space-between' }}>
          <Typography sx={{ fontWeight: 800 }}>{review.user_name}</Typography>
          <Typography variant="caption" color="text.secondary">
            {formatDate(review.created_at)}
          </Typography>
        </Stack>
        <Rating value={review.rating} readOnly size="small" aria-label={t('ecommStore.rating.short', { vars: { rating: review.rating } })} />
        {review.comment ? <Typography sx={{ whiteSpace: 'pre-line' }}>{review.comment}</Typography> : null}
        {review.seller_reply ? (
          <Stack sx={{ bgcolor: T.page, borderRadius: 2, p: 1.5 }}>
            <Typography variant="caption" sx={{ fontWeight: 800 }}>
              {t('ecommStore.reviews.sellerReply')}
            </Typography>
            <Typography variant="body2">{review.seller_reply}</Typography>
          </Stack>
        ) : null}
      </Stack>
    </Paper>
  );
}

/** Ratings summary, the reviews, and — for a signed-in buyer — the review form. */
export function ProductReviews({ product }: Readonly<{ product: StoreProduct }>) {
  const { t } = useStoreT();
  const { signedIn, openSignIn } = useStoreSession();
  const { data } = useQuery(PRODUCT_REVIEWS, { variables: { product_id: product.id } });
  const reviews = data?.storeProductReviews ?? [];
  return (
    <Stack component="section" aria-labelledby="reviews-heading" spacing={2}>
      <Typography id="reviews-heading" variant="h2">
        {t('ecommStore.reviews.title')}
      </Typography>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} sx={{ alignItems: 'flex-start' }}>
        {product.rating_count > 0 ? <StarBars product={product} /> : <Typography color="text.secondary">{t('ecommStore.reviews.none')}</Typography>}
        <Stack spacing={1.5} component="ul" sx={{ p: 0, m: 0, flexGrow: 1, width: '100%' }}>
          {reviews.map((review) => (
            <ReviewItem key={review.id} review={review} />
          ))}
        </Stack>
      </Stack>
      {signedIn ? (
        <ReviewForm productId={product.id} />
      ) : (
        <DuncitButton variant="outlined" onClick={openSignIn} sx={{ alignSelf: 'flex-start' }}>
          {t('ecommStore.reviews.signInToWrite')}
        </DuncitButton>
      )}
    </Stack>
  );
}
