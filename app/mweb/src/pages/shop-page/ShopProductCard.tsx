import { Box, Card, CardActionArea, Chip, CircularProgress, IconButton, Stack, Typography } from '@mui/material';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import AddShoppingCartIcon from '@mui/icons-material/AddShoppingCart';
import type { ShopProduct } from './queries';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  product: ShopProduct;
  priceFormat: (amount: number) => string;
  adding: boolean;
  onOpen: (id: string) => void;
  onQuickAdd: (product: ShopProduct) => void;
}

/** One product tile in the Pod Shop browse grid — image, name, price and (when
 * reviewed) an average-rating chip. Tapping opens the full product detail page;
 * the corner button quick-adds to cart via the cheapest pod (with a light
 * haptic where supported). */
export default function ShopProductCard({
  product,
  priceFormat,
  adding,
  onOpen,
  onQuickAdd,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const imageUrl = product.image_url || product.images?.[0] || '';
  const summary = product.review_summary;
  const hasRating = !!summary && summary.total > 0;
  const outOfStock = product.pod_available_count <= 0;
  const quickAdd = () => {
    globalThis.navigator?.vibrate?.(8);
    onQuickAdd(product);
  };
  return (
    <Card
      sx={{ position: 'relative', borderRadius: '16px', border: 1, borderColor: 'divider', boxShadow: 'none', overflow: 'hidden' }}
    >
      <CardActionArea onClick={() => onOpen(product.id)} aria-label={`View ${product.product_name}`}>
        <Box sx={{ aspectRatio: '1 / 1', bgcolor: 'action.hover' }}>
          {imageUrl && (
            <Box
              component="img"
              src={imageUrl}
              alt={product.product_name}
              sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          )}
        </Box>
        <Stack spacing={0.25} sx={{ p: 1.25 }}>
          <Typography variant="body2" sx={{ fontWeight: 600 }} noWrap>
            {product.product_name}
          </Typography>
          {product.brand_name && (
            <Typography variant="caption" color="text.secondary" noWrap>
              {product.brand_name}
            </Typography>
          )}
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 0.25 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700, color: 'primary.main' }}>
              {priceFormat(product.unit_cost)}
            </Typography>
            {hasRating && (
              <Stack direction="row" alignItems="center" spacing={0.25}>
                <StarRoundedIcon sx={{ fontSize: 16, color: '#f5a623' }} />
                <Typography variant="caption" sx={{ fontWeight: 600 }}>
                  {summary.average_rating.toFixed(1)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  ({summary.total})
                </Typography>
              </Stack>
            )}
          </Stack>
        </Stack>
      </CardActionArea>
      {outOfStock ? (
        <Chip
          label={t('mweb.shop.outOfStock')}
          size="small"
          sx={{
            position: 'absolute',
            top: 6,
            right: 6,
            height: 22,
            fontWeight: 600,
            fontSize: 11,
            bgcolor: 'grey.800',
            color: 'common.white',
          }}
        />
      ) : (
        <IconButton
          aria-label={`Add ${product.product_name} to cart`}
          disabled={adding}
          onClick={quickAdd}
          size="small"
          sx={{
            position: 'absolute',
            top: 6,
            right: 6,
            bgcolor: 'primary.main',
            color: 'primary.contrastText',
            boxShadow: 2,
            '&:hover': { bgcolor: 'primary.dark' },
            '&.Mui-disabled': { bgcolor: 'primary.main', color: 'primary.contrastText' },
          }}
        >
          {adding ? (
            <CircularProgress size={16} sx={{ color: 'primary.contrastText' }} />
          ) : (
            <AddShoppingCartIcon sx={{ fontSize: 18 }} />
          )}
        </IconButton>
      )}
    </Card>
  );
}
