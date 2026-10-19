import { Box, Stack, Typography } from '@mui/material';
import StarRoundedIcon from '@mui/icons-material/StarRounded';

import type { StoreProductCard } from '../../graphql/catalog';
import { useMoney } from '../../lib/money';
import { useStoreT } from '../../i18n';
import { STORE_TOKENS as T } from '../../theme/tokens';

/** "1.2K" for 1,234 — the shopper's own number format. */
const COMPACT = new Intl.NumberFormat(undefined, { notation: 'compact', maximumFractionDigits: 1 });

/** ★ 4.8 (1.2K) — one image for assistive technology, read as the full sentence. */
export function CardRating({ product }: Readonly<{ product: StoreProductCard }>) {
  const { t } = useStoreT();
  if (product.rating_count <= 0) return null;
  const rating = product.rating.toFixed(1);
  return (
    <Stack
      direction="row"
      spacing={0.5}
      role="img"
      aria-label={t('ecommStore.rating.summary', { vars: { rating, count: product.rating_count } })}
      sx={{ alignItems: 'center' }}
    >
      <StarRoundedIcon sx={{ fontSize: 18, color: T.festive }} aria-hidden />
      <Typography variant="body2" sx={{ fontWeight: 800 }} aria-hidden>
        {rating}
      </Typography>
      <Typography variant="body2" color="text.secondary" aria-hidden>
        {t('ecommStore.card.ratingCount', { vars: { count: COMPACT.format(product.rating_count) } })}
      </Typography>
    </Stack>
  );
}

/** The price, the struck list price and the "16% off" chip, then any offer line. */
export function CardPrice({ product }: Readonly<{ product: StoreProductCard }>) {
  const { t } = useStoreT();
  const money = useMoney();
  const reduced = product.mrp > product.price;
  return (
    <Stack spacing={0.5}>
      <Stack direction="row" spacing={1} useFlexGap sx={{ alignItems: 'baseline', flexWrap: 'wrap' }}>
        <Typography sx={{ fontWeight: 800, fontSize: '1.3rem', lineHeight: 1.2 }}>{money(product.price)}</Typography>
        {reduced ? (
          <Typography
            component="s"
            variant="body2"
            color="text.secondary"
            aria-label={t('ecommStore.price.wasNamed', { vars: { price: money(product.mrp) } })}
          >
            {money(product.mrp)}
          </Typography>
        ) : null}
        {reduced && product.discount_pct > 0 ? (
          <Box
            component="span"
            sx={{ alignSelf: 'center', bgcolor: T.brandTint, color: T.ctaInk, fontWeight: 800, fontSize: '0.75rem', lineHeight: 1.6, borderRadius: T.radius.pill, px: 1 }}
          >
            {t('ecommStore.price.off', { vars: { pct: product.discount_pct } })}
          </Box>
        ) : null}
      </Stack>
      {product.offer_text ? (
        <Typography variant="caption" sx={{ fontWeight: 700 }} data-testid="product-card-offer">
          {product.offer_text}
        </Typography>
      ) : null}
    </Stack>
  );
}
