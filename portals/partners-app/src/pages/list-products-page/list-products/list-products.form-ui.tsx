import {
  Alert,
  Box,
  Button,
  FormControl,
  FormControlLabel,
  FormHelperText,
  FormLabel,
  IconButton,
  Radio,
  RadioGroup,
  Slider,
  Stack,
  Typography,
} from '@mui/material';
import { Controller, type Control, type UseFormSetValue, type UseFormWatch } from 'react-hook-form';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import CloseIcon from '@mui/icons-material/Close';
import { RhfTextField } from '@duncit/forms';
import type { ProductListingValues } from './list-products.types';
import CategoryCascade, { type CategoryErrors } from './CategoryCascade';
import VariantTabs from './VariantTabs';

export interface CategoryStep {
  superId: string;
  categoryId: string;
  subId: string;
  errors: CategoryErrors;
  onChange: (next: { superId: string; categoryId: string; subId: string }) => void;
}

const hints: Record<string, string> = {
  product_name: 'Use the exact product name hosts will understand during pod creation.',
  description: 'Mention what is included, how it is used, and any handling notes.',
  size_label: 'Example: Small pouch, Medium box, XL hamper.',
  height_cm: 'Approximate package height in centimeters.',
  weight_kg: 'Approximate packed weight in kilograms.',
  color: 'Primary colour of the default variant. Add more colours as variants below.',
  inventory_count: 'Total units currently available for Duncit hosts.',
  unit_cost: 'Final per-unit selling price shown to users.',
};

interface StepProps {
  step: number;
  control: Control<ProductListingValues>;
  watch: UseFormWatch<ProductListingValues>;
  setValue: UseFormSetValue<ProductListingValues>;
  onImageClick: () => void;
  category: CategoryStep;
}

export function StepBody({ step, control, watch, setValue, onImageClick, category }: Readonly<StepProps>) {
  if (step === 0) {
    return <CategoryCascade superId={category.superId} categoryId={category.categoryId} subId={category.subId} errors={category.errors} onChange={category.onChange} />;
  }
  if (step === 1) {
    return <Stack spacing={2}>{field(control, 'product_name', 'Product title')}<ImageField control={control} watch={watch} setValue={setValue} onImageClick={onImageClick} />{field(control, 'description', 'Description', 'text', true)}</Stack>;
  }
  if (step === 2) {
    return <InventoryFields control={control} />;
  }
  if (step === 3) {
    return <CommissionField control={control} />;
  }
  if (step === 4) {
    return <StringRadioField control={control} name="delivery_target" label="Delivery option" options={[['HOST', 'Self delivery to host'], ['VENUE', 'Self delivery to venue']]} />;
  }
  return <Preview values={watch()} />;
}

function field(control: Control<ProductListingValues>, name: keyof ProductListingValues, label: string, type = 'text', multiline = false) {
  return <RhfTextField control={control} name={name} label={label} type={type} multiline={multiline} minRows={multiline ? 4 : undefined} hint={hints[name]} />;
}

interface NumberInputProps {
  min: number;
  step: number;
  inputMode: 'numeric' | 'decimal';
}

function numberField(control: Control<ProductListingValues>, name: keyof ProductListingValues, label: string, inputProps: NumberInputProps) {
  return <RhfTextField control={control} name={name} label={label} type="number" hint={hints[name]} inputProps={inputProps} />;
}

function InventoryFields({ control }: Readonly<{ control: Control<ProductListingValues> }>) {
  return (
    <Stack spacing={2}>
      {field(control, 'size_label', 'Size')}
      {numberField(control, 'height_cm', 'Height (cm)', { min: 0.1, step: 0.1, inputMode: 'decimal' })}
      {numberField(control, 'weight_kg', 'Weight (kg)', { min: 0.01, step: 0.01, inputMode: 'decimal' })}
      <RhfTextField
        control={control}
        name="color"
        label="Color"
        type="color"
        hint={hints.color}
        InputLabelProps={{ shrink: true }}
        sx={{ maxWidth: 160 }}
      />
      {numberField(control, 'inventory_count', 'Available inventory', { min: 1, step: 1, inputMode: 'numeric' })}
      {numberField(control, 'unit_cost', 'Product price (₹)', { min: 1, step: 1, inputMode: 'decimal' })}
      <VariantTabs control={control} />
    </Stack>
  );
}

function CommissionField({ control }: Readonly<{ control: Control<ProductListingValues> }>) {
  return (
    <Controller
      control={control}
      name="commission_pct"
      render={({ field }) => (
        <Box>
          <Typography fontWeight={900}>Duncit commission: {field.value}%</Typography>
          <Slider min={5} max={50} value={field.value} onChange={(_, value) => field.onChange(value)} valueLabelDisplay="auto" />
          <Alert severity="info">Higher commission improves marketplace viability, but approval still depends on product quality, pricing, and fulfillment clarity.</Alert>
        </Box>
      )}
    />
  );
}

interface ImageFieldProps {
  control: Control<ProductListingValues>;
  watch: UseFormWatch<ProductListingValues>;
  setValue: UseFormSetValue<ProductListingValues>;
  onImageClick: () => void;
}

function ImageField({ control, watch, setValue, onImageClick }: Readonly<ImageFieldProps>) {
  const images = watch('image_urls') ?? [];
  const removeImage = (url: string) => setValue('image_urls', images.filter((item) => item !== url), { shouldValidate: true });
  return (
    <Controller
      control={control}
      name="image_urls"
      render={({ fieldState }) => (
        <Stack spacing={1}>
          {images.length > 0 && (
            <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' } }}>
              {images.map((url) => (
                <Box key={url} sx={{ position: 'relative', borderRadius: 2, overflow: 'hidden', border: 1, borderColor: 'divider' }}>
                  <Box component="img" src={url} alt="Product" sx={{ width: '100%', aspectRatio: '1 / 1', objectFit: 'cover', display: 'block' }} />
                  <IconButton size="small" onClick={() => removeImage(url)} sx={{ position: 'absolute', top: 4, right: 4, bgcolor: 'rgba(0,0,0,0.5)', color: '#fff', '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' } }}>
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))}
            </Box>
          )}
          <Button variant="outlined" startIcon={<AddPhotoAlternateIcon />} onClick={onImageClick}>Add product image</Button>
          <FormHelperText error={Boolean(fieldState.error)}>{fieldState.error?.message ?? 'Upload clear images from multiple angles. The first image becomes the main product photo.'}</FormHelperText>
        </Stack>
      )}
    />
  );
}

interface RadioFieldProps {
  control: Control<ProductListingValues>;
  label: string;
  options: string[][];
}

function StringRadioField({ control, name, label, options }: Readonly<RadioFieldProps & { name: 'delivery_target' }>) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <FormControl error={Boolean(fieldState.error)}>
          <FormLabel>{label}</FormLabel>
          <RadioGroup value={field.value} onChange={(event) => field.onChange(event.target.value)}>
            {options.map(([optionValue, optionLabel]) => <FormControlLabel key={optionValue} value={optionValue} control={<Radio />} label={optionLabel} />)}
          </RadioGroup>
          <FormHelperText>{fieldState.error?.message}</FormHelperText>
        </FormControl>
      )}
    />
  );
}

function Preview({ values }: Readonly<{ values: ProductListingValues }>) {
  return <Stack spacing={1.25}><Typography variant="h6" fontWeight={950}>{values.product_name || 'Product preview'}</Typography><Typography color="text.secondary">{values.description}</Typography><Typography>Images: {values.image_urls.length} · Inventory: {values.inventory_count} · Price: ₹{values.unit_cost}</Typography><Typography>Commission: {values.commission_pct}% · Delivery: {values.delivery_target === 'HOST' ? 'Host' : 'Venue'}</Typography></Stack>;
}
