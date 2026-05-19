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
  TextField,
  Typography,
} from '@mui/material';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import CloseIcon from '@mui/icons-material/Close';
import type { ProductListingValues } from './list-products.types';

const hints: Record<string, string> = {
  product_name: 'Use the exact product name hosts will understand during pod creation.',
  description: 'Mention what is included, how it is used, and any handling notes.',
  size_label: 'Example: Small pouch, Medium box, XL hamper.',
  height_cm: 'Approximate package height in centimeters.',
  weight_kg: 'Approximate packed weight in kilograms.',
  color: 'Primary visible color or assorted if it varies.',
  inventory_count: 'Total units currently available for Duncit hosts.',
  unit_cost: 'Final per-unit selling price shown to users.',
};

export function StepBody({ step, formik, onImageClick }: { step: number; formik: any; onImageClick: () => void }) {
  if (step === 0) return <RadioField formik={formik} name="is_duncit_delivery_partner" label="Are you a Duncit product delivery partner?" options={[['true', 'Yes, I deliver Duncit products'], ['false', 'No, I am not a delivery partner yet']]} />;
  if (step === 1) return <Stack spacing={2}>{field(formik, 'product_name', 'Product title')}<ImageField formik={formik} onImageClick={onImageClick} />{field(formik, 'description', 'Description', 'text', true)}</Stack>;
  if (step === 2) return <Stack spacing={2}>{field(formik, 'size_label', 'Size')}{field(formik, 'height_cm', 'Height (cm)', 'number')}{field(formik, 'weight_kg', 'Weight (kg)', 'number')}{field(formik, 'color', 'Color')}{field(formik, 'inventory_count', 'Available inventory', 'number')}{field(formik, 'unit_cost', 'Product price', 'number')}</Stack>;
  if (step === 3) return <Box><Typography fontWeight={900}>Duncit commission: {formik.values.commission_pct}%</Typography><Slider min={5} max={50} value={formik.values.commission_pct} onChange={(_, value) => formik.setFieldValue('commission_pct', value)} valueLabelDisplay="auto" /><Alert severity="info">Higher commission improves marketplace viability, but approval still depends on product quality, pricing, and fulfillment clarity.</Alert></Box>;
  if (step === 4) return <RadioField formik={formik} name="delivery_target" label="Delivery option" options={[['HOST', 'Self delivery to host'], ['VENUE', 'Self delivery to venue']]} />;
  return <Preview values={formik.values} />;
}

function field(formik: any, name: string, label: string, type = 'text', multiline = false) {
  const touched = formik.touched[name];
  const error = touched && formik.errors[name];
  return <TextField name={name} label={label} type={type} value={formik.values[name]} onChange={formik.handleChange} onBlur={formik.handleBlur} multiline={multiline} minRows={multiline ? 4 : undefined} error={Boolean(error)} helperText={error || hints[name] || ' '} fullWidth />;
}

function ImageField({ formik, onImageClick }: { formik: any; onImageClick: () => void }) {
  const images = formik.values.image_urls ?? [];
  const error = formik.touched.image_urls && formik.errors.image_urls;
  const removeImage = (url: string) => formik.setFieldValue('image_urls', images.filter((item: string) => item !== url));
  return (
    <Stack spacing={1}>
      {images.length > 0 && (
        <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' } }}>
          {images.map((url: string) => (
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
      <FormHelperText error={Boolean(error)}>{error || 'Upload clear images from multiple angles. The first image becomes the main product photo.'}</FormHelperText>
    </Stack>
  );
}

function RadioField({ formik, name, label, options }: { formik: any; name: string; label: string; options: string[][] }) {
  const value = name === 'is_duncit_delivery_partner' ? String(formik.values[name]) : formik.values[name];
  return <FormControl error={Boolean(formik.touched[name] && formik.errors[name])}><FormLabel>{label}</FormLabel><RadioGroup value={value} onChange={(event) => formik.setFieldValue(name, name === 'is_duncit_delivery_partner' ? event.target.value === 'true' : event.target.value)}>{options.map(([optionValue, optionLabel]) => <FormControlLabel key={optionValue} value={optionValue} control={<Radio />} label={optionLabel} />)}</RadioGroup><FormHelperText>{formik.touched[name] && formik.errors[name]}</FormHelperText></FormControl>;
}

function Preview({ values }: { values: ProductListingValues }) {
  return <Stack spacing={1.25}><Typography variant="h6" fontWeight={950}>{values.product_name || 'Product preview'}</Typography><Typography color="text.secondary">{values.description}</Typography><Typography>Images: {values.image_urls.length} · Inventory: {values.inventory_count} · Price: ₹{values.unit_cost}</Typography><Typography>Commission: {values.commission_pct}% · Delivery: {values.delivery_target === 'HOST' ? 'Host' : 'Venue'}</Typography></Stack>;
}