import type { ReactNode } from 'react';
import { Grid, Stack } from '@mui/material';
import { useSchemaForm } from '../../../../components/form/useSchemaForm';
import type { ProductStatus } from '../../../../lib/status';
import type { StoreProduct } from '../../queries';
import BasicsSection from './BasicsSection';
import ContentSection from './ContentSection';
import PhotosSection from './PhotosSection';
import PricingSection from './PricingSection';
import { RulesSection, SeoSection } from './SeoSection';
import ShelfSection from './ShelfSection';
import ShippingSection from './ShippingSection';
import VariantsSection from './VariantsSection';
import { toProductInput, toProductValues, type ProductInput } from './product.input';
import { makeProductSchema, type ProductValues } from './product.types';

/** Validate the page and save it as `status` — what each action button does. */
export type SubmitAs = (status: ProductStatus) => Promise<void>;

interface ProductFormProps {
  /** The saved product; `null` while creating one. */
  initial: StoreProduct | null;
  /** Answers the product as saved, or `null` when the save did not go through. */
  onSave: (input: ProductInput, status: ProductStatus) => Promise<StoreProduct | null>;
  /** The action bar, handed the one way to submit. */
  renderActions: (submitAs: SubmitAs) => ReactNode;
}

/**
 * Everything the store knows about one product, section by section. Saving
 * resets the form to what the server kept (a minted SKU, a free URL key).
 */
export default function ProductForm({ initial, onSave, renderActions }: Readonly<ProductFormProps>) {
  const { t, form } = useSchemaForm<ProductValues>(makeProductSchema, toProductValues(initial));
  const { control, handleSubmit, reset, setValue } = form;
  const submitAs: SubmitAs = (status) =>
    handleSubmit(async (values) => {
      const saved = await onSave(toProductInput(values), status);
      if (saved) reset(toProductValues(saved));
    })();
  return (
    <form noValidate onSubmit={(event) => event.preventDefault()} aria-label={t('ecommPortal.productEditor.form')} data-testid="product-form">
      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Stack spacing={3}>
            <BasicsSection control={control} />
            <PhotosSection control={control} />
            <PricingSection control={control} />
            <VariantsSection control={control} setValue={setValue} />
            <ShippingSection control={control} setValue={setValue} />
            <ContentSection control={control} />
            <SeoSection control={control} />
          </Stack>
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <Stack spacing={3}>
            <ShelfSection control={control} />
            <RulesSection control={control} />
          </Stack>
        </Grid>
      </Grid>
      {renderActions(submitAs)}
    </form>
  );
}
