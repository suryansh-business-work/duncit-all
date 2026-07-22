import { Box, Button, Chip, IconButton, Stack } from '@mui/material';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import CloseIcon from '@mui/icons-material/Close';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { type Control, type Path, type UseFormSetValue, type UseFormWatch } from 'react-hook-form';
import { RhfTextField } from '@duncit/forms';
import type { ProductListingValues, VariantOptionValue } from './list-products.types';

interface VariantImagesProps {
  images: string[];
  onAdd: () => void;
  onRemove: (url: string) => void;
}

/** Per-variant image grid + picker trigger. Hoisted to module scope (S6478). */
function VariantImages({ images, onAdd, onRemove }: Readonly<VariantImagesProps>) {
  return (
    <Stack spacing={1}>
      {images.length > 0 && (
        <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(4, 1fr)' } }}>
          {images.map((url) => (
            <Box key={url} sx={{ position: 'relative', borderRadius: 2, overflow: 'hidden', border: 1, borderColor: 'divider' }}>
              <Box component="img" src={url} alt="Variant" sx={{ width: '100%', aspectRatio: '1 / 1', objectFit: 'cover', display: 'block' }} />
              <IconButton
                size="small"
                onClick={() => onRemove(url)}
                sx={{ position: 'absolute', top: 4, right: 4, bgcolor: 'rgba(0,0,0,0.5)', color: '#fff', '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' } }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Box>
          ))}
        </Box>
      )}
      <Button variant="outlined" startIcon={<AddPhotoAlternateIcon />} onClick={onAdd}>
        Add variant image
      </Button>
    </Stack>
  );
}

const numberField = (control: Control<ProductListingValues>, name: Path<ProductListingValues>, label: string) => (
  <RhfTextField control={control} name={name} label={label} type="number" inputProps={{ min: 0, step: 0.1, inputMode: 'decimal' }} />
);

interface Props {
  control: Control<ProductListingValues>;
  index: number;
  watch: UseFormWatch<ProductListingValues>;
  setValue: UseFormSetValue<ProductListingValues>;
  onPickImage: (index: number) => void;
  onRemove: () => void;
  canRemove: boolean;
}

/** All inputs for one variant — its own media, copy, dimensions, price and stock. */
export default function VariantFields({ control, index, watch, setValue, onPickImage, onRemove, canRemove }: Readonly<Props>) {
  const nm = (fieldName: string) => `variants.${index}.${fieldName}` as Path<ProductListingValues>;
  const imagePath = `variants.${index}.image_urls` as Path<ProductListingValues>;
  const images = (watch(imagePath) as string[] | undefined) ?? [];
  const optionValues = (watch(`variants.${index}.option_values` as Path<ProductListingValues>) as
    | VariantOptionValue[]
    | undefined) ?? [];
  const removeImage = (url: string) =>
    setValue(imagePath, images.filter((item) => item !== url), { shouldValidate: true });

  return (
    <Stack spacing={2}>
      {optionValues.length > 0 ? (
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {optionValues.map((option) => (
            <Chip key={`${option.name}-${option.value}`} label={`${option.name}: ${option.value}`} size="small" color="primary" variant="outlined" />
          ))}
        </Stack>
      ) : (
        <RhfTextField control={control} name={nm('option_label')} label="Variant name (e.g. Default)" />
      )}
      <VariantImages images={images} onAdd={() => onPickImage(index)} onRemove={removeImage} />
      <RhfTextField
        control={control}
        name={nm('description')}
        label="Description"
        multiline
        minRows={3}
        hint="Describe this variant — what's included, how it's used, handling notes."
      />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        {numberField(control, nm('height_cm'), 'Height (cm)')}
        {numberField(control, nm('weight_kg'), 'Weight (kg)')}
      </Stack>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        {numberField(control, nm('length_cm'), 'Length (cm)')}
        {numberField(control, nm('breadth_cm'), 'Breadth (cm)')}
      </Stack>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        {numberField(control, nm('unit_cost'), 'Price (₹)')}
        {numberField(control, nm('inventory_count'), 'Stock')}
      </Stack>
      <Button color="error" size="small" startIcon={<DeleteOutlineIcon />} onClick={onRemove} disabled={!canRemove} sx={{ alignSelf: 'flex-start' }}>
        Remove this variant
      </Button>
    </Stack>
  );
}
