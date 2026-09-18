import { Link as RouterLink } from 'react-router';
import { Box, Chip, Link, Stack, Typography } from '@mui/material';
import StarRoundedIcon from '@mui/icons-material/StarRounded';

import type { StoreProductCard } from '../../graphql/catalog';
import { useMoney } from '../../lib/money';
import { paths } from '../../lib/paths';
import { useStoreT } from '../../i18n';
import { STORE_TOKENS as T, tintAt } from '../../theme/tokens';
import { StoreImage } from '../StoreImage';
import { AddButton } from './AddButton';
import { WishlistButton } from './WishlistButton';

const IMAGE_SIZE = 240;

const hoverSwap = {
  position: 'absolute',
  inset: 0,
  opacity: 0,
  transition: 'opacity 200ms ease',
  '.product-card:hover &, .product-card:focus-within &': { opacity: 1 },
} as const;

function CardStatus({ product }: Readonly<{ product: StoreProductCard }>) {
  const { t } = useStoreT();
  const money = useMoney();
  const reduced = product.mrp > product.price;
  return (
    <Stack spacing={0.25}>
      {product.rating_count > 0 ? (
        <Stack direction="row" spacing={0.25} aria-label={t('ecommStore.rating.short', { vars: { rating: product.rating.toFixed(1) } })} role="img" sx={{ alignItems: 'center' }}>
          <StarRoundedIcon sx={{ fontSize: 16, color: T.ink }} aria-hidden />
          <Typography variant="caption" sx={{ fontWeight: 700 }} aria-hidden>
            {product.rating.toFixed(1)}
          </Typography>
        </Stack>
      ) : null}
      <Stack direction="row" spacing={0.75} useFlexGap sx={{ alignItems: 'baseline', flexWrap: 'wrap' }}>
        <Typography sx={{ fontWeight: 800, fontSize: '1.05rem' }}>{money(product.price)}</Typography>
        {reduced ? (
          <Typography component="s" variant="caption" color="text.secondary" aria-label={t('ecommStore.price.wasNamed', { vars: { price: money(product.mrp) } })}>
            {money(product.mrp)}
          </Typography>
        ) : null}
        {reduced && product.discount_pct > 0 ? (
          <Typography variant="caption" color="success.main" sx={{ fontWeight: 800 }}>
            {t('ecommStore.price.off', { vars: { pct: product.discount_pct } })}
          </Typography>
        ) : null}
      </Stack>
      {product.in_stock ? null : (
        <Typography variant="caption" sx={{ fontWeight: 800 }}>
          {t('ecommStore.card.outOfStock')}
        </Typography>
      )}
    </Stack>
  );
}

interface ProductCardProps {
  product: StoreProductCard;
  /** Position in its grid — picks the pastel. */
  position: number;
}

/** The pastel shelf card: name, rating, price, the round "+", the photo on a white panel. */
export function ProductCard({ product, position }: Readonly<ProductCardProps>) {
  const { t } = useStoreT();
  const badge = product.badge || (product.low_stock && product.in_stock ? t('ecommStore.card.lowStock') : '');
  return (
    <Stack className="product-card" spacing={1.25} sx={{ bgcolor: tintAt(position), borderRadius: `${T.radius.card}px`, p: 1.5, height: '100%' }}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
        <Stack spacing={0.25} sx={{ flexGrow: 1, minWidth: 0 }}>
          <Link
            component={RouterLink}
            to={paths.product(product.slug)}
            color="inherit"
            underline="hover"
            sx={{ fontWeight: 800, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', minHeight: '2.6em', lineHeight: 1.3 }}
          >
            {product.title}
          </Link>
          <CardStatus product={product} />
        </Stack>
        <AddButton product={product} />
      </Stack>
      <Box sx={{ position: 'relative', bgcolor: T.surface, borderRadius: `${T.radius.panel}px`, overflow: 'hidden', mt: 'auto' }}>
        <Link component={RouterLink} to={paths.product(product.slug)} tabIndex={-1} aria-hidden underline="none">
          <Box sx={{ position: 'relative' }}>
            <StoreImage src={product.image_url} alt={product.title} width={IMAGE_SIZE} height={IMAGE_SIZE} sx={{ objectFit: 'contain', p: 1 }} />
            {product.hover_image_url ? (
              <StoreImage src={product.hover_image_url} alt="" width={IMAGE_SIZE} height={IMAGE_SIZE} sx={{ ...hoverSwap, objectFit: 'contain', p: 1 }} />
            ) : null}
          </Box>
        </Link>
        {badge ? (
          <Chip size="small" label={badge} sx={{ position: 'absolute', top: 8, left: 8, bgcolor: T.ink, color: T.onBrand }} />
        ) : null}
        <WishlistButton productId={product.id} productTitle={product.title} sx={{ position: 'absolute', top: 4, right: 4 }} />
      </Box>
    </Stack>
  );
}
