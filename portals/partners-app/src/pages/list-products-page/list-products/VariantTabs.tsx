import { useState } from 'react';
import { Box, Button, Stack, Tab, Tabs, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { useFieldArray, type Control, type UseFormSetValue, type UseFormWatch } from 'react-hook-form';
import type { ProductListingValues } from './list-products.types';
import { emptyVariant } from './list-products.map';
import VariantFields from './VariantFields';

interface Props {
  control: Control<ProductListingValues>;
  watch: UseFormWatch<ProductListingValues>;
  setValue: UseFormSetValue<ProductListingValues>;
  onPickImage: (index: number) => void;
}

/** Step 3 of the wizard: the product's variants as tabs. Every variant (including
 * the first) carries its own media, description, size, dimensions, price & stock. */
export default function VariantTabs({ control, watch, setValue, onPickImage }: Readonly<Props>) {
  const { fields, append, remove } = useFieldArray({ control, name: 'variants' });
  const [active, setActive] = useState(0);
  const current = Math.min(active, fields.length - 1);

  const addVariant = () => {
    append({ ...emptyVariant });
    setActive(fields.length);
  };
  const removeVariant = (index: number) => {
    remove(index);
    setActive((cur) => Math.max(0, Math.min(cur, fields.length - 2)));
  };

  return (
    <Stack spacing={1.5}>
      <Typography variant="subtitle2" fontWeight={800}>
        Variants
      </Typography>
      <Typography variant="caption" color="text.secondary">
        Each variant carries its own images, description, size, dimensions, price and stock.
      </Typography>
      <Tabs value={current} onChange={(_, value) => setActive(value)} variant="scrollable" scrollButtons="auto">
        {fields.map((field, index) => (
          <Tab key={field.id} label={`Variant ${index + 1}`} />
        ))}
      </Tabs>
      {fields.map((field, index) => (
        <Box key={field.id} hidden={current !== index}>
          <VariantFields
            control={control}
            index={index}
            watch={watch}
            setValue={setValue}
            onPickImage={onPickImage}
            onRemove={() => removeVariant(index)}
            canRemove={fields.length > 1}
          />
        </Box>
      ))}
      <Button variant="outlined" startIcon={<AddIcon />} onClick={addVariant} sx={{ alignSelf: 'flex-start' }}>
        Add variant
      </Button>
    </Stack>
  );
}
