import { Box, Stack } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { SectionCard } from '@duncit/ui';
import RhfNumberField from '../../../../components/form/RhfNumberField';
import { THREE_COLUMNS, TWO_COLUMNS } from './layout';
import type { ProductControl } from './product.types';
import WarehouseField from './WarehouseField';

/** Where the parcel ships from and what it weighs and measures — what the courier quotes on. */
export default function ShippingSection({ control }: Readonly<{ control: ProductControl }>) {
  const { t } = useTranslation();
  const cm = t('ecommPortal.productEditor.cm');
  return (
    <SectionCard title={t('ecommPortal.productEditor.shipping')} subtitle={t('ecommPortal.productEditor.shippingHint')}>
      <Stack spacing={1} data-testid="product-section-shipping">
        <WarehouseField control={control} />
        <Box sx={TWO_COLUMNS}>
          <RhfNumberField
            control={control}
            name="weight_kg"
            label={t('ecommPortal.productEditor.weight')}
            hint={t('ecommPortal.productEditor.weightHint')}
            unit={t('ecommPortal.productEditor.kg')}
            testId="product-weight"
          />
        </Box>
        <Box sx={THREE_COLUMNS}>
          <RhfNumberField control={control} name="length_cm" label={t('ecommPortal.productEditor.length')} unit={cm} testId="product-length" />
          <RhfNumberField control={control} name="breadth_cm" label={t('ecommPortal.productEditor.breadth')} unit={cm} testId="product-breadth" />
          <RhfNumberField control={control} name="height_cm" label={t('ecommPortal.productEditor.height')} unit={cm} testId="product-height" />
        </Box>
      </Stack>
    </SectionCard>
  );
}
