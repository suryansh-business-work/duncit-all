import { Box, Card, CardActionArea, Chip, Stack, Typography } from '@mui/material';
import StarRoundedIcon from '@mui/icons-material/StarRounded';
import type { ShopProduct } from './queries';

interface Props {
  product: ShopProduct;
  priceFormat: (amount: number) => string;
  categoryLabel?: string;
  onOpen: (id: string) => void;
}

/** One product tile in the Pod Shop browse grid — category badge, image, name,
 * price and (when reviewed) an average-rating chip. Tapping opens the full
 * product detail page. */
export default function ShopProductCard({
  product,
  priceFormat,
  categoryLabel,
  onOpen,
}: Readonly<Props>) {
  const imageUrl = product.image_url || product.images?.[0] || '';
  const summary = product.review_summary;
  const hasRating = !!summary && summary.total > 0;
  return (
    <Card
      sx={{ position: 'relative', borderRadius: 3, border: 1, borderColor: 'divider', boxShadow: 'none', overflow: 'hidden' }}
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
          <Typography variant="body2" sx={{ fontWeight: 800 }} noWrap>
            {product.product_name}
          </Typography>
          {product.brand_name && (
            <Typography variant="caption" color="text.secondary" noWrap>
              {product.brand_name}
            </Typography>
          )}
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 0.25 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 900, color: 'primary.main' }}>
              {priceFormat(product.unit_cost)}
            </Typography>
            {hasRating && (
              <Stack direction="row" alignItems="center" spacing={0.25}>
                <StarRoundedIcon sx={{ fontSize: 16, color: '#f5a623' }} />
                <Typography variant="caption" sx={{ fontWeight: 800 }}>
                  {summary!.average_rating.toFixed(1)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  ({summary!.total})
                </Typography>
              </Stack>
            )}
          </Stack>
        </Stack>
      </CardActionArea>
      {categoryLabel && (
        <Chip
          label={categoryLabel}
          size="small"
          sx={{
            position: 'absolute',
            top: 8,
            left: 8,
            height: 22,
            fontWeight: 800,
            fontSize: 11,
            bgcolor: 'background.paper',
            color: 'primary.main',
          }}
        />
      )}
    </Card>
  );
}
