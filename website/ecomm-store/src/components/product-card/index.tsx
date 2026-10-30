import { Link as RouterLink } from 'react-router';
import { Box, Chip, Link, Stack } from '@mui/material';

import type { StoreProductCard } from '../../graphql/catalog';
import { paths } from '../../lib/paths';
import { useStoreT } from '../../i18n';
import { STORE_TOKENS as T, tintAt } from '../../theme/tokens';
import { StoreImage } from '../StoreImage';
import { CardCartControl, CardCartNotice } from './CardCartControl';
import { CardPrice, CardRating } from './CardPrice';
import { WishlistButton } from './WishlistButton';

const IMAGE_SIZE = 280;

const hoverSwap = {
  position: 'absolute',
  inset: 0,
  opacity: 0,
  transition: 'opacity 200ms ease',
  '.product-card:hover &, .product-card:focus-within &': { opacity: 1 },
} as const;

const TITLE_CLAMP = {
  fontWeight: 800,
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
  minHeight: '2.6em',
  lineHeight: 1.3,
} as const;

interface ProductCardProps {
  product: StoreProductCard;
  /** Position in its grid; it picks the image panel's tint. */
  position: number;
}

/**
 * The shelf card: the photo on a soft tint with its badge and heart, the name,
 * rating and price, and a full-width "Add to cart" (or the quantity pill once
 * the product is in the cart).
 */
export function ProductCard({ product, position }: Readonly<ProductCardProps>) {
  const { t } = useStoreT();
  const badge = product.badge || (product.low_stock && product.in_stock ? t('ecommStore.card.lowStock') : '');
  return (
    <Stack
      className="product-card"
      spacing={1.5}
      sx={{ bgcolor: T.surface, borderRadius: `${T.radius.card}px`, boxShadow: T.shadow, p: 1.5, height: '100%' }}
    >
      <Box sx={{ position: 'relative', bgcolor: tintAt(position), borderRadius: `${T.radius.panel}px`, overflow: 'hidden' }}>
        <Link component={RouterLink} to={paths.product(product.slug)} tabIndex={-1} aria-hidden underline="none">
          <Box sx={{ position: 'relative' }}>
            <StoreImage src={product.image_url} alt={product.title} width={IMAGE_SIZE} height={IMAGE_SIZE} sx={{ objectFit: 'contain', p: 2 }} />
            {product.hover_image_url ? (
              <StoreImage src={product.hover_image_url} alt="" width={IMAGE_SIZE} height={IMAGE_SIZE} sx={{ ...hoverSwap, objectFit: 'contain', p: 2 }} />
            ) : null}
          </Box>
        </Link>
        {badge ? (
          <Chip
            size="small"
            label={badge}
            sx={{ position: 'absolute', top: 10, left: 10, maxWidth: 'calc(100% - 72px)', bgcolor: tintAt(position + 2), color: T.ink, border: 1, borderColor: T.border, fontWeight: 800 }}
          />
        ) : null}
        <WishlistButton
          productId={product.id}
          productTitle={product.title}
          sx={{ position: 'absolute', top: 6, right: 6, bgcolor: T.surface, boxShadow: T.shadow, '&:hover': { bgcolor: T.surface } }}
        />
        <CardCartNotice product={product} />
      </Box>
      <Stack spacing={0.75} sx={{ minWidth: 0, flexGrow: 1 }}>
        <Link component={RouterLink} to={paths.product(product.slug)} color="inherit" underline="hover" sx={TITLE_CLAMP}>
          {product.title}
        </Link>
        <CardRating product={product} />
        <Box sx={{ mt: 'auto' }}>
          <CardPrice product={product} />
        </Box>
      </Stack>
      <CardCartControl product={product} />
    </Stack>
  );
}
