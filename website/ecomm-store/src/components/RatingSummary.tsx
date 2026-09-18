import { Rating, Stack, Typography } from '@mui/material';

import { useStoreT } from '../i18n';

interface RatingSummaryProps {
  rating: number;
  count: number;
  size?: 'small' | 'medium';
}

/** Stars plus the review count. Nothing at all for an unreviewed product. */
export function RatingSummary({ rating, count, size = 'small' }: Readonly<RatingSummaryProps>) {
  const { t } = useStoreT();
  if (count <= 0) return null;
  const label = t('ecommStore.rating.summary', { vars: { rating: rating.toFixed(1), count } });
  return (
    <Stack direction="row" spacing={0.5} role="img" aria-label={label} sx={{ alignItems: 'center' }}>
      <Rating value={rating} precision={0.5} readOnly size={size} aria-hidden />
      <Typography variant="caption" color="text.secondary" aria-hidden>
        {`(${count})`}
      </Typography>
    </Stack>
  );
}
