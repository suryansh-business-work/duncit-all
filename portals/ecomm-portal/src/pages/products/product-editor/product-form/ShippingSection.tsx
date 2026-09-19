import { Stack } from '@mui/material';
import { PackagingFields } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import { SectionCard } from '@duncit/ui';
import type { ProductControl, ProductSetValue } from './product.types';
import WarehouseField from './WarehouseField';

/**
 * Where the parcel ships from and what it is, packed: weight and L × B × H
 * (the courier bills the higher of the two weights), package type, HSN for
 * the invoice, and the handling flags. A variant with its own parcel overrides
 * the weight and dimensions here.
 */
export default function ShippingSection({ control, setValue }: Readonly<{ control: ProductControl; setValue: ProductSetValue }>) {
  const { t } = useTranslation();
  return (
    <SectionCard title={t('ecommPortal.productEditor.shipping')} subtitle={t('packaging.intro')}>
      <Stack spacing={2} data-testid="product-section-shipping">
        <WarehouseField control={control} />
        <PackagingFields control={control} setValue={setValue} t={t} />
      </Stack>
    </SectionCard>
  );
}
