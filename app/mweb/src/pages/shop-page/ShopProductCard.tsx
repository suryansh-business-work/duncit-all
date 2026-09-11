import {
  Box,
  Card,
  CardActionArea,
  Chip,
  CircularProgress,
  Stack,
  Typography,
} from '@mui/material';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import { DuncitIconButton } from '@duncit/buttons';
import type { ShopProduct } from './queries';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  product: ShopProduct;
  priceFormat: (amount: number) => string;
  adding: boolean;
  onOpen: (id: string) => void;
  onQuickAdd: (product: ShopProduct) => void;
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

/** The round green "+" that quick-adds — pinned to the card's bottom-right,
 * outside the tappable area so a button never sits inside a button. */
const ADD_SX = {
  position: 'absolute',
  right: 8,
  bottom: 8,
  width: 36,
  height: 36,
  minHeight: 36,
  bgcolor: 'primary.main',
  color: 'primary.contrastText',
  '&:hover': { bgcolor: 'primary.dark' },
  '&.Mui-disabled': { bgcolor: 'primary.main', color: 'primary.contrastText' },
} as const;

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
    <Card sx={{ position: 'relative', overflow: 'hidden' }}>
      <CardActionArea onClick={() => onOpen(product.id)} aria-label={`View ${product.product_name}`} sx={{ p: 1 }}>
        <Box sx={{ aspectRatio: '1 / 1', bgcolor: 'action.hover', borderRadius: '18px', overflow: 'hidden' }}>
          {imageUrl && (
            <Box
              component="img"
              src={imageUrl}
              alt={product.product_name}
              sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          )}
        </Box>
        <Stack spacing={0.25} sx={{ pt: 1, px: 0.5, pb: 0.25 }}>
          <Typography sx={NAME_SX}>{product.product_name}</Typography>
          {product.brand_name && (
            <Typography variant="caption" noWrap sx={{ color: 'text.secondary' }}>
              {product.brand_name}
            </Typography>
          )}
          {hasRating && (
            <Stack direction="row" spacing={0.25} sx={{ alignItems: 'center' }}>
              <StarRoundedIcon sx={{ fontSize: 16, color: 'warning.main' }} />
              <Typography variant="caption" sx={{ fontWeight: 600 }}>
                {summary.average_rating.toFixed(1)}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                ({summary.total})
              </Typography>
            </Stack>
          )}
          <Typography sx={{ fontSize: '1rem', fontWeight: 700, pt: 0.5, pr: 5, minHeight: 36, display: 'flex', alignItems: 'center' }}>
            {priceFormat(product.unit_cost)}
          </Typography>
        </Stack>
      </CardActionArea>
      {outOfStock ? (
        <Chip
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
      ) : (
        <DuncitIconButton
          aria-label={`Add ${product.product_name} to cart`}
          disabled={adding}
          onClick={quickAdd}
          size="small"
          sx={ADD_SX}
        >
          {adding ? (
            <CircularProgress size={16} sx={{ color: 'primary.contrastText' }} />
          ) : (
            <AddRoundedIcon sx={{ fontSize: 22 }} />
          )}
        </DuncitIconButton>
      )}
    </Card>
  );
}
