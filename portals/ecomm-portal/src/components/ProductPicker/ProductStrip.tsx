import { Box, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { money } from '../../lib/format';
import ProductThumb from '../ProductThumb';

/** A picked product as the strip and the list show it. */
export interface PickedProduct {
  id: string;
  title: string;
  imageUrl: string;
  caption: string;
  price: number;
}

/** The picked products side by side, in order — roughly how the store's slider will lay them out. */
export default function ProductStrip({ products }: Readonly<{ products: readonly PickedProduct[] }>) {
  const { t } = useTranslation();
  if (products.length === 0) return null;
  return (
    <Box
      role="group"
      aria-label={t('ecommPortal.picker.preview')}
      sx={{ display: 'flex', gap: 1.5, overflowX: 'auto', pb: 1, scrollSnapType: 'x mandatory' }}
    >
      {products.map((product) => (
        <Stack key={product.id} spacing={0.5} sx={{ width: 120, flexShrink: 0, scrollSnapAlign: 'start' }}>
          <ProductThumb src={product.imageUrl} size={120} />
          <Typography variant="caption" sx={{ fontWeight: 600, lineHeight: 1.3 }}>
            {product.title}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {money(product.price)}
          </Typography>
        </Stack>
      ))}
    </Box>
  );
}
