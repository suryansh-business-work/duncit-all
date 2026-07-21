import { Box, Card, CardActionArea, Stack, Typography } from '@mui/material';
import type { ShopProduct } from './queries';

interface Props {
  product: ShopProduct;
  priceFormat: (amount: number) => string;
  onOpen: (id: string) => void;
}

/** One product tile in the Pod Shop browse grid — tapping opens the product
 * detail page. */
export default function ShopProductCard({ product, priceFormat, onOpen }: Readonly<Props>) {
  const imageUrl = product.image_url || product.images?.[0] || '';
  return (
    <Card sx={{ borderRadius: 3, border: 1, borderColor: 'divider', boxShadow: 'none' }}>
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
          <Typography variant="subtitle2" sx={{ fontWeight: 900, color: 'primary.main' }}>
            {priceFormat(product.unit_cost)}
          </Typography>
        </Stack>
      </CardActionArea>
    </Card>
  );
}
