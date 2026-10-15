import { Box, Card, CardActionArea, Chip, Stack, Typography } from '@mui/material';
import { alpha, type Theme } from '@mui/material/styles';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import { CartControlNoticeChip, CartQuantityControl, useCartControlNotice } from '@duncit/ui';
import type { ShopProduct } from './queries';
import { useCartControlLabels } from '../../components/cart/useCartControlLabels';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  product: ShopProduct;
  priceFormat: (amount: number) => string;
  /** How many of this product the cart's quick-add line holds; 0 when it has none. */
  quantity: number;
  /** The most that line may hold — its pod's stock. */
  max: number;
  /** The quick-add is looking the pod up: taps wait. */
  busy: boolean;
  onOpen: (id: string) => void;
  /** The quantity one step away; 0 takes the product out of the cart. */
  onQuantity: (product: ShopProduct, next: number) => void;
}

const NAME_SX = {
  fontSize: '0.875rem',
  fontWeight: 600,
  lineHeight: 1.3,
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
} as const;

/** The photo sits on a soft brand-tinted well, so a cut-out product shot on a
 * transparent or white ground still reads as a tile. */
const PHOTO_WELL_SX = {
  aspectRatio: '1 / 1',
  borderRadius: '18px',
  overflow: 'hidden',
  background: (theme: Theme) =>
    `linear-gradient(155deg, ${alpha(theme.palette.primary.main, 0.14)} 0%, ${alpha(theme.palette.secondary.main, 0.08)} 100%)`,
} as const;

/** The price as a dark tag — the ink colour as the fill, so it inverts in dark mode. */
const PRICE_TAG_SX = {
  display: 'inline-flex',
  alignItems: 'center',
  mt: 0.25,
  px: 1.25,
  py: 0.375,
  borderRadius: 999,
  bgcolor: 'text.primary',
  color: 'background.paper',
  fontSize: '0.875rem',
  fontWeight: 700,
  lineHeight: 1.4,
} as const;

/** The card's padding, which is also how far the photo sits from its edges. */
const inset = (theme: Theme) => theme.spacing(1);

/** Lies exactly over the photo without being inside the tappable area, so the
 * cart control never sits inside a button. Only the control takes taps. */
const PHOTO_OVERLAY_SX = {
  position: 'absolute',
  top: inset,
  left: inset,
  right: inset,
  aspectRatio: '1 / 1',
  pointerEvents: 'none',
} as const;

/** The photo's bottom-right corner: the pill opens leftwards from the "+". */
const CONTROL_SX = {
  position: 'absolute',
  right: inset,
  bottom: inset,
  pointerEvents: 'auto',
} as const;

/** One product tile in the Pod Shop browse grid — image, name, price and (when
 * reviewed) an average-rating chip. Tapping opens the full product detail page;
 * the control on the photo quick-adds via the cheapest pod (with a light
 * haptic where supported), then steps or removes that same cart line. */
export default function ShopProductCard({
  product,
  priceFormat,
  quantity,
  max,
  busy,
  onOpen,
  onQuantity,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const labels = useCartControlLabels()(product.product_name);
  const notice = useCartControlNotice(quantity);
  const imageUrl = product.image_url || product.images?.[0] || '';
  const summary = product.review_summary;
  const hasRating = !!summary && summary.total > 0;
  const outOfStock = product.pod_available_count <= 0;
  const change = (next: number) => {
    if (next > quantity) globalThis.navigator?.vibrate?.(8);
    onQuantity(product, next);
  };
  return (
    <Card
      data-testid={`shop-product-${product.id}`}
      sx={{ position: 'relative', overflow: 'hidden' }}
    >
      <CardActionArea
        onClick={() => onOpen(product.id)}
        aria-label={`View ${product.product_name}`}
        sx={{ p: 1 }}
      >
        <Box sx={PHOTO_WELL_SX}>
          {imageUrl && (
            <Box
              component="img"
              src={imageUrl}
              alt={product.product_name}
              loading="lazy"
              sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          )}
        </Box>
        <Stack spacing={0.5} sx={{ pt: 1.25, px: 0.5, pb: 0.5 }}>
          <Typography data-testid={`shop-product-name-${product.id}`} sx={NAME_SX}>
            {product.product_name}
          </Typography>
          {(product.brand_name || hasRating) && (
            <Stack direction="row" spacing={0.75} sx={{ alignItems: 'center', minWidth: 0 }}>
              {product.brand_name && (
                <Typography variant="caption" noWrap sx={{ color: 'text.secondary', minWidth: 0 }}>
                  {product.brand_name}
                </Typography>
              )}
              {hasRating && (
                <Stack
                  data-testid={`shop-product-rating-${product.id}`}
                  direction="row"
                  spacing={0.25}
                  sx={{ alignItems: 'center', flex: '0 0 auto' }}
                >
                  <StarRoundedIcon sx={{ fontSize: 14, color: 'warning.main' }} />
                  <Typography variant="caption" sx={{ fontWeight: 600 }}>
                    {summary.average_rating.toFixed(1)}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                    ({summary.total})
                  </Typography>
                </Stack>
              )}
            </Stack>
          )}
          <Box>
            <Typography
              component="span"
              data-testid={`shop-product-price-${product.id}`}
              sx={PRICE_TAG_SX}
            >
              {priceFormat(product.unit_cost)}
            </Typography>
          </Box>
        </Stack>
      </CardActionArea>
      {outOfStock && (
        <Chip
          data-testid={`shop-product-oos-${product.id}`}
          label={t('mweb.shop.outOfStock')}
          size="small"
          sx={{
            position: 'absolute',
            top: 16,
            right: 16,
            height: 24,
            fontWeight: 600,
            fontSize: 11,
            bgcolor: 'grey.800',
            color: 'common.white',
          }}
        />
      )}
      <Box sx={PHOTO_OVERLAY_SX}>
        <CartControlNoticeChip
          notice={notice}
          labels={labels}
          testId={`shop-product-${product.id}-notice`}
        />
        {/* Sold out takes the "+" away, but what is already in the cart can still be taken out. */}
        {(!outOfStock || quantity > 0) && (
          <CartQuantityControl
            quantity={quantity}
            max={max}
            labels={labels}
            onChange={change}
            busy={busy}
            testIdPrefix={`shop-product-${product.id}`}
            sx={CONTROL_SX}
          />
        )}
      </Box>
    </Card>
  );
}
