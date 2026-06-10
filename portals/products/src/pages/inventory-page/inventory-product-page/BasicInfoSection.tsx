import {
  FormHelperText,
  Grid,
  MenuItem,
  TextField,
} from '@mui/material';
import { useFormikContext } from 'formik';
import TagsInput from './TagsInput';
import { PRODUCT_TYPE_OPTIONS, UNIT_TYPE_OPTIONS } from './constants';
import type { InventoryProductFormValues } from './types';

interface BasicInfoSectionProps {
  categories: { id: string; name: string }[];
}

export default function BasicInfoSection({ categories }: Readonly<BasicInfoSectionProps>) {
  const f = useFormikContext<InventoryProductFormValues>();
  const showError = (field: keyof InventoryProductFormValues) =>
    !!(f.touched[field] && f.errors[field]);
  const helper = (field: keyof InventoryProductFormValues, fallback: string) =>
    (f.touched[field] && (f.errors[field] as string)) || fallback;

  return (
    <Grid container spacing={2}>
      <Grid item xs={12} sm={8}>
        <TextField
          fullWidth
          required
          name="product_name"
          label="Product name"
          value={f.values.product_name}
          onChange={f.handleChange}
          onBlur={f.handleBlur}
          error={showError('product_name')}
          helperText={helper('product_name', 'Customer-facing name, e.g. "Cold Brew Coffee 250ml"')}
        />
      </Grid>
      <Grid item xs={12} sm={4}>
        <TextField
          fullWidth
          name="brand_name"
          label="Brand name"
          value={f.values.brand_name}
          onChange={f.handleChange}
          helperText="Manufacturer or brand"
        />
      </Grid>
      <Grid item xs={12} sm={4}>
        <TextField
          select
          fullWidth
          required
          name="product_type"
          label="Product type"
          value={f.values.product_type}
          onChange={f.handleChange}
        >
          {PRODUCT_TYPE_OPTIONS.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </TextField>
        <FormHelperText>Consumable items reduce stock when used in pods.</FormHelperText>
      </Grid>
      <Grid item xs={12} sm={4}>
        <TextField
          select
          fullWidth
          required
          name="unit_type"
          label="Unit type"
          value={f.values.unit_type}
          onChange={f.handleChange}
        >
          {UNIT_TYPE_OPTIONS.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </TextField>
        <FormHelperText>How is one unit measured?</FormHelperText>
      </Grid>
      <Grid item xs={12} sm={4}>
        <TextField
          select
          fullWidth
          name="category_id"
          label="Category"
          value={f.values.category_id}
          onChange={f.handleChange}
          helperText="Pick from existing categories"
        >
          <MenuItem value="">— uncategorised —</MenuItem>
          {categories.map((cat) => (
            <MenuItem key={cat.id} value={cat.id}>
              {cat.name}
            </MenuItem>
          ))}
        </TextField>
      </Grid>
      <Grid item xs={12}>
        <TextField
          fullWidth
          name="short_description"
          label="Short description"
          value={f.values.short_description}
          onChange={f.handleChange}
          onBlur={f.handleBlur}
          error={showError('short_description')}
          helperText={helper(
            'short_description',
            `One-line marketing pitch · ${f.values.short_description.length}/280`
          )}
        />
      </Grid>
      <Grid item xs={12}>
        <TextField
          fullWidth
          multiline
          minRows={4}
          name="description"
          label="Full description"
          value={f.values.description}
          onChange={f.handleChange}
          onBlur={f.handleBlur}
          error={showError('description')}
          helperText={helper(
            'description',
            `Detailed copy for listings · ${f.values.description.length}/4000`
          )}
        />
      </Grid>
      <Grid item xs={12}>
        <TagsInput
          value={f.values.tags}
          onChange={(next) => f.setFieldValue('tags', next)}
        />
      </Grid>
    </Grid>
  );
}
