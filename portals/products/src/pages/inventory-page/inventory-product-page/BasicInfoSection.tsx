import {
  Chip,
  FormHelperText,
  Grid,
  MenuItem,
} from '@mui/material';
import VerifiedIcon from '@mui/icons-material/Verified';
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import { RhfTextField } from '@duncit/forms';
import TagsInput from './TagsInput';
import { PRODUCT_TYPE_OPTIONS, UNIT_TYPE_OPTIONS } from './constants';
import type { InventoryProductFormValues } from './types';
import { useTranslation } from '@duncit/shell';

interface BasicInfoSectionProps {
  categories: { id: string; name: string }[];
}

export default function BasicInfoSection({ categories }: Readonly<BasicInfoSectionProps>) {
  const { t } = useTranslation();
  const { control } = useFormContext<InventoryProductFormValues>();
  const shortDescription = useWatch({ control, name: 'short_description' });
  const description = useWatch({ control, name: 'description' });
  const ownership = useWatch({ control, name: 'ownership' });
  const ownerLabel = ownership === 'BRAND' ? 'Product owner: Brand' : 'Product owner: Duncit';

  return (
    <Grid container spacing={2}>
      <Grid size={12}>
        <Chip
          color="primary"
          variant="outlined"
          icon={<VerifiedIcon />}
          label={ownerLabel}
        />
      </Grid>
      <Grid
        size={{
          xs: 12,
          sm: 8
        }}>
        <RhfTextField
          control={control}
          required
          name="product_name"
          label={t('products.basic.productName')}
          hint='Customer-facing name, e.g. "Cold Brew Coffee 250ml"'
        />
      </Grid>
      <Grid
        size={{
          xs: 12,
          sm: 4
        }}>
        <RhfTextField
          control={control}
          name="brand_name"
          label={t('products.basic.brandName')}
          hint="Manufacturer or brand"
        />
      </Grid>
      <Grid
        size={{
          xs: 12,
          sm: 4
        }}>
        <RhfTextField select control={control} required name="product_type" label={t('products.basic.productType')} hint=" ">
          {PRODUCT_TYPE_OPTIONS.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </RhfTextField>
        <FormHelperText>{t('products.basic.consumableHint')}</FormHelperText>
      </Grid>
      <Grid
        size={{
          xs: 12,
          sm: 4
        }}>
        <RhfTextField select control={control} required name="unit_type" label={t('products.basic.unitType')} hint=" ">
          {UNIT_TYPE_OPTIONS.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </RhfTextField>
        <FormHelperText>{t('products.basic.unitHint')}</FormHelperText>
      </Grid>
      <Grid
        size={{
          xs: 12,
          sm: 4
        }}>
        <RhfTextField
          select
          control={control}
          name="category_id"
          label={t('products.basic.category')}
          hint="Pick from existing categories"
        >
          <MenuItem value="">— uncategorised —</MenuItem>
          {categories.map((cat) => (
            <MenuItem key={cat.id} value={cat.id}>
              {cat.name}
            </MenuItem>
          ))}
        </RhfTextField>
      </Grid>
      <Grid size={12}>
        <RhfTextField
          control={control}
          name="short_description"
          label={t('products.basic.shortDescription')}
          hint={`One-line marketing pitch · ${(shortDescription ?? '').length}/280`}
        />
      </Grid>
      <Grid size={12}>
        <RhfTextField
          control={control}
          multiline
          minRows={4}
          name="description"
          label={t('products.basic.fullDescription')}
          hint={`Detailed copy for listings · ${(description ?? '').length}/4000`}
        />
      </Grid>
      <Grid size={12}>
        <Controller
          control={control}
          name="tags"
          render={({ field }) => (
            <TagsInput value={field.value ?? []} onChange={field.onChange} />
          )}
        />
      </Grid>
    </Grid>
  );
}
