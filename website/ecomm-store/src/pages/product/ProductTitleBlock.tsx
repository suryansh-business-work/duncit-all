import { Stack, Typography } from '@mui/material';

import { RatingSummary } from '../../components/RatingSummary';
import { WishlistButton } from '../../components/product-card/WishlistButton';
import type { StoreProduct } from '../../graphql/product';
import { STORE_TOKENS as T } from '../../theme/tokens';

/** The name, the brand / size line under it, the rating, and the heart. */
export function ProductTitleBlock({ product }: Readonly<{ product: StoreProduct }>) {
  const subtitle = [product.brand_name, product.weight_volume].filter(Boolean).join(' · ');
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start', justifyContent: 'space-between' }}>
      <Stack spacing={0.5}>
        <Typography variant="h1" sx={{ fontSize: { xs: '1.9rem', md: '2.25rem' } }}>
          {product.title}
        </Typography>
        {subtitle ? <Typography color="text.secondary">{subtitle}</Typography> : null}
        <RatingSummary rating={product.rating} count={product.rating_count} size="medium" />
      </Stack>
      <WishlistButton productId={product.id} productTitle={product.title} sx={{ border: 1, borderColor: T.border, bgcolor: T.surface }} />
    </Stack>
  );
}
