import {
  Chip,
  FormHelperText,
  Grid,
  MenuItem,
} from '@mui/material';
import VerifiedIcon from '@mui/icons-material/Verified';
import { Controller, useFormContext, useWatch } from 'react-hook-form';
import RhfTextField from '../../../forms/components/RhfTextField';
import TagsInput from './TagsInput';
import { PRODUCT_TYPE_OPTIONS, UNIT_TYPE_OPTIONS } from './constants';
import type { InventoryProductFormValues } from './types';

interface BasicInfoSectionProps {
  categories: { id: string; name: string }[];
}

export default function BasicInfoSection({ categories }: Readonly<BasicInfoSectionProps>) {
  const { control, setValue } = useFormContext<InventoryProductFormValues>();
  const shortDescription = useWatch({ control, name: 'short_description' });
  const description = useWatch({ control, name: 'description' });

  return (
    <Grid container spacing={2}>
      <Grid item xs={12}>
        <Chip
          color="primary"
          variant="outlined"
          icon={<VerifiedIcon />}
          label="Product owner: Duncit"
        />
      </Grid>
      <Grid item xs={12} sm={8}>
        <RhfTextField
          control={control}
          required
          name="product_name"
          label="Product name"
          hint='Customer-facing name, e.g. "Cold Brew Coffee 250ml"'
        />
      </Grid>
      <Grid item xs={12} sm={4}>
        <RhfTextField
          control={control}
          name="brand_name"
          label="Brand name"
          hint="Manufacturer or brand"
        />
      </Grid>
      <Grid item xs={12} sm={4}>
        <RhfTextField select control={control} required name="product_type" label="Product type" hint=" ">
          {PRODUCT_TYPE_OPTIONS.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </RhfTextField>
        <FormHelperText>Consumable items reduce stock when used in pods.</FormHelperText>
      </Grid>
      <Grid item xs={12} sm={4}>
        <RhfTextField select control={control} required name="unit_type" label="Unit type" hint=" ">
          {UNIT_TYPE_OPTIONS.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </RhfTextField>
        <FormHelperText>How is one unit measured?</FormHelperText>
      </Grid>
      <Grid item xs={12} sm={4}>
        <RhfTextField
          select
          control={control}
          name="category_id"
          label="Category"
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
      <Grid item xs={12}>
        <RhfTextField
          control={control}
          name="short_description"
          label="Short description"
          hint={`One-line marketing pitch · ${(shortDescription ?? '').length}/280`}
        />
      </Grid>
      <Grid item xs={12}>
        <RhfTextField
          control={control}
          multiline
          minRows={4}
          name="description"
          label="Full description"
          hint={`Detailed copy for listings · ${(description ?? '').length}/4000`}
        />
      </Grid>
      <Grid item xs={12}>
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
