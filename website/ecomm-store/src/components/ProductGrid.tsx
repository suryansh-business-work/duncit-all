import { Box } from '@mui/material';

import type { StoreProductCard } from '../graphql/catalog';
import { ProductCard } from './product-card';

const LIST_RESET = { listStyle: 'none', p: 0, m: 0 } as const;

/** Responsive shelf grid: two cards on a phone, up to five on a wide desktop. */
export function ProductGrid({ products, dense = false }: Readonly<{ products: StoreProductCard[]; dense?: boolean }>) {
  const wide = dense ? 'repeat(4, minmax(0, 1fr))' : 'repeat(5, minmax(0, 1fr))';
  return (
    <Box
      component="ul"
      sx={{
        ...LIST_RESET,
        display: 'grid',
        gap: { xs: 1.5, md: 2 },
        gridTemplateColumns: { xs: 'repeat(2, minmax(0, 1fr))', sm: 'repeat(3, minmax(0, 1fr))', lg: wide },
      }}
    >
      {products.map((product, position) => (
        <Box component="li" key={product.id}>
          <ProductCard product={product} position={position} />
        </Box>
      ))}
    </Box>
  );
}

