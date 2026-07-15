import { useState } from 'react';
import { Box, Button, Stack, Tab, Tabs, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { useFieldArray, type Control, type Path } from 'react-hook-form';
import RhfTextField from '../../../forms/components/RhfTextField';
import type { ProductListingValues } from './list-products.types';

const emptyVariant = {
  option_label: '',
  color: '#000000',
  size_label: '',
  unit_cost: '',
  inventory_count: '',
  image_urls: [] as string[],
};

/** Additional product variants (colour / size / …) as tabs — each with its own
 * price and stock. The product's own fields are the default/primary variant. */
export default function VariantTabs({ control }: Readonly<{ control: Control<ProductListingValues> }>) {
  const { fields, append, remove } = useFieldArray({ control, name: 'variants' });
  const [active, setActive] = useState(0);
  const nm = (i: number, f: string) => `variants.${i}.${f}` as Path<ProductListingValues>;

  const addVariant = () => {
    append(emptyVariant);
    setActive(fields.length);
  };
  const removeVariant = (index: number) => {
    remove(index);
    setActive((cur) => Math.max(0, Math.min(cur, fields.length - 2)));
  };
  const current = Math.min(active, fields.length - 1);

  return (
    <Stack spacing={1.5} sx={{ mt: 1 }}>
      <Typography variant="subtitle2" fontWeight={800}>
        More variants (colour / size)
      </Typography>
      <Typography variant="caption" color="text.secondary">
        The details above are the default variant. Add more for other colours or sizes — each has
        its own price and stock.
      </Typography>
      {fields.length > 0 && (
        <>
          <Tabs
            value={current}
            onChange={(_, v) => setActive(v)}
            variant="scrollable"
            scrollButtons="auto"
          >
            {fields.map((f, i) => (
              <Tab key={f.id} label={`Variant ${i + 1}`} />
            ))}
          </Tabs>
          {fields.map((f, i) => (
            <Box key={f.id} hidden={current !== i}>
              <Stack spacing={2}>
                <RhfTextField control={control} name={nm(i, 'option_label')} label="Variant name (e.g. Red / L)" />
                <RhfTextField
                  control={control}
                  name={nm(i, 'color')}
                  label="Colour"
                  type="color"
                  InputLabelProps={{ shrink: true }}
                  sx={{ maxWidth: 160 }}
                />
                <RhfTextField control={control} name={nm(i, 'size_label')} label="Size" />
                <RhfTextField
                  control={control}
                  name={nm(i, 'unit_cost')}
                  label="Price (₹)"
                  type="number"
                  inputProps={{ min: 1, step: 1, inputMode: 'decimal' }}
                />
                <RhfTextField
                  control={control}
                  name={nm(i, 'inventory_count')}
                  label="Stock"
                  type="number"
                  inputProps={{ min: 0, step: 1, inputMode: 'numeric' }}
                />
                <Button
                  color="error"
                  size="small"
                  startIcon={<DeleteOutlineIcon />}
                  onClick={() => removeVariant(i)}
                  sx={{ alignSelf: 'flex-start' }}
                >
                  Remove this variant
                </Button>
              </Stack>
            </Box>
          ))}
        </>
      )}
      <Button variant="outlined" startIcon={<AddIcon />} onClick={addVariant} sx={{ alignSelf: 'flex-start' }}>
        Add variant
      </Button>
    </Stack>
  );
}
