import { Box, Stack } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import { SectionCard } from '@duncit/ui';
import BrandField, { ManageBrandsLink } from './BrandField';
import { TWO_COLUMNS } from './layout';
import type { ProductControl } from './product.types';

/** What the product is called, its code, its brand and what it says about itself. */
export default function BasicsSection({ control }: Readonly<{ control: ProductControl }>) {
  const { t } = useTranslation();
  return (
    <SectionCard title={t('ecommPortal.productEditor.basics')} action={<ManageBrandsLink />}>
      <Stack spacing={1} data-testid="product-section-basics">
        <RhfTextField control={control} name="product_name" label={t('shell.common.name')} required data-testid="product-name" />
        <Box sx={TWO_COLUMNS}>
          <RhfTextField
            control={control}
            name="sku"
            label={t('ecommPortal.products.sku')}
            hint={t('ecommPortal.productEditor.skuHint')}
            data-testid="product-sku"
          />
          <BrandField control={control} />
        </Box>
        <RhfTextField
          control={control}
          name="short_description"
          label={t('ecommPortal.productEditor.shortDescription')}
          hint={t('ecommPortal.productEditor.shortDescriptionHint')}
          multiline
          minRows={2}
          data-testid="product-short-description"
        />
        <RhfTextField
          control={control}
          name="description"
          label={t('shell.common.description')}
          multiline
          minRows={5}
          data-testid="product-description"
        />
      </Stack>
    </SectionCard>
  );
}
