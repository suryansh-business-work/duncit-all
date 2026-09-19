import { useId } from 'react';
import { Stack, Typography } from '@mui/material';
import type { Control, UseFormSetValue } from 'react-hook-form';
import { PackagingFields } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import type { ProductListingValues } from './list-products.types';

interface Props {
  control: Control<ProductListingValues>;
  setValue: UseFormSetValue<ProductListingValues>;
  /** '' for the product's own parcel, `variants.<i>.` for one variant's. */
  prefix?: string;
  /** Package type, HSN code, handling flags and shelf life — product-wide, so off for a variant. */
  productFields: boolean;
  /** The line under the heading saying what this parcel is. */
  note: string;
}

/**
 * "Shipping & packaging" in the listing wizard: the product's packed parcel on
 * the Product step (every variant's fallback) and, per variant, an optional
 * parcel of its own for a size that packs differently.
 */
export default function PackagingSection({ control, setValue, prefix = '', productFields, note }: Readonly<Props>) {
  const { t } = useTranslation();
  const headingId = useId();
  return (
    <Stack spacing={1.5} component="section" aria-labelledby={headingId}>
      <Typography id={headingId} variant="subtitle2" component="h3" sx={{ fontWeight: 800 }}>
        {t('packaging.title')}
      </Typography>
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
        {note}
      </Typography>
      <PackagingFields control={control} setValue={setValue} t={t} prefix={prefix} productFields={productFields} />
    </Stack>
  );
}
