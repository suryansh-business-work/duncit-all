import { useWatch } from 'react-hook-form';
import { Alert, Box, Stack } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import { SectionCard } from '@duncit/ui';
import RhfNumberField from '../../../../components/form/RhfNumberField';
import DiscountHelper from './DiscountHelper';
import { TWO_COLUMNS } from './layout';
import type { ProductControl, ProductSetValue } from './product.types';

/**
 * The selling price, the MRP it is compared against, and the stock. Once the
 * product has variants each of them carries its own, so these give way.
 */
export default function PricingSection({ control, setValue }: Readonly<{ control: ProductControl; setValue: ProductSetValue }>) {
  const { t } = useTranslation();
  const hasVariants = useWatch({ control, name: 'variants' }).length > 0;
  return (
    <SectionCard title={t('ecommPortal.productEditor.pricing')} subtitle={t('ecommPortal.productEditor.pricingHint')}>
      <Stack spacing={1} data-testid="product-section-pricing">
        {hasVariants ? (
          <Alert severity="info" data-testid="product-priced-by-variants">
            {t('ecommPortal.productEditor.pricedByVariants')}
          </Alert>
        ) : (
          <Box sx={TWO_COLUMNS}>
            <RhfNumberField control={control} name="price" label={t('ecommPortal.products.price')} hint={t('ecommPortal.productEditor.neededToPublish')} testId="product-price" />
            <RhfNumberField control={control} name="mrp" label={t('ecommPortal.products.mrp')} hint={t('ecommPortal.productEditor.mrpHint')} testId="product-mrp" />
            <RhfNumberField control={control} name="stock" label={t('ecommPortal.productEditor.stock')} whole testId="product-stock" />
            <DiscountHelper control={control} setValue={setValue} />
          </Box>
        )}
        <RhfTextField
          control={control}
          name="offer_text"
          label={t('ecommPortal.productEditor.offerText')}
          hint={t('ecommPortal.productEditor.offerHint')}
          data-testid="product-offer-text"
        />
        <Box sx={TWO_COLUMNS}>
          <RhfNumberField
            control={control}
            name="low_stock_alert"
            label={t('ecommPortal.productEditor.lowStockAlert')}
            hint={t('ecommPortal.productEditor.lowStockHint')}
            whole
            testId="product-low-stock"
          />
        </Box>
      </Stack>
    </SectionCard>
  );
}
