import { Link as RouterLink } from 'react-router';
import { useQuery } from '@apollo/client/react';
import { Link, MenuItem } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import { STORE_BRANDS, type StoreBrand } from '../../../../queries/taxonomy';
import type { ProductControl } from './product.types';

/** Opens the Brands page in a new tab, so the product being edited is not lost. */
export function ManageBrandsLink() {
  const { t } = useTranslation();
  const label = t('ecommPortal.productEditor.manageBrands');
  return (
    <Link
      component={RouterLink}
      to="/brands"
      target="_blank"
      rel="noopener noreferrer"
      variant="body2"
      aria-label={t('ecommPortal.common.opensInNewTab', { vars: { label } })}
      data-testid="product-manage-brands"
    >
      {label}
    </Link>
  );
}

/** Pick one of the store's own brands, or none. A switched-off brand still shows, marked as such. */
export default function BrandField({ control }: Readonly<{ control: ProductControl }>) {
  const { t } = useTranslation();
  const brands: readonly StoreBrand[] = useQuery(STORE_BRANDS, { fetchPolicy: 'cache-and-network' }).data?.storeAdminBrands ?? [];
  const brandLabel = (brand: StoreBrand) =>
    brand.is_active ? brand.name : t('ecommPortal.productEditor.brandOff', { vars: { name: brand.name } });
  return (
    <RhfTextField
      control={control}
      name="brand_id"
      label={t('ecommPortal.products.brand')}
      hint={t('ecommPortal.productEditor.brandHint')}
      select
      data-testid="product-brand"
    >
      <MenuItem value="">{t('ecommPortal.productEditor.noBrand')}</MenuItem>
      {brands.map((brand) => (
        <MenuItem key={brand.id} value={brand.id}>
          {brandLabel(brand)}
        </MenuItem>
      ))}
    </RhfTextField>
  );
}
