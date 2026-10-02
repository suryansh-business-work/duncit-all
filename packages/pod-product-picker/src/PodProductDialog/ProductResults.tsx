import { Alert, Box, Grid } from '@mui/material';
import type { PodPickerProduct } from '@duncit/utils';
import ProductCard from '../ProductCard';
import type { useTranslation } from '../i18n/useTranslation';

interface ResultsProps {
  products: readonly PodPickerProduct[];
  /** Size of the pod's eligible catalogue before filters — tells an empty
   * result from an empty category. */
  total: number;
  added: ReadonlySet<string>;
  selectedId: string;
  onSelect: (id: string) => void;
  t: ReturnType<typeof useTranslation>['t'];
}

/** The grid, or the empty state that explains which kind of empty this is. */
export function ProductResults({ products, total, added, selectedId, onSelect, t }: Readonly<ResultsProps>) {
  if (total === 0) {
    return <Alert severity="info">{t('podProduct.emptyCategory')}</Alert>;
  }
  if (products.length === 0) {
    return <Alert severity="info">{t('podProduct.emptySearch')}</Alert>;
  }
  return (
    <Box>
      <Grid container spacing={2}>
        {products.map((product) => (
          <Grid
            key={product.id}
            size={{
              xs: 12,
              sm: 6,
              lg: 4
            }}>
            <ProductCard
              product={product}
              selected={product.id === selectedId}
              added={added.has(String(product.id))}
              onSelect={onSelect}
              t={t}
            />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
