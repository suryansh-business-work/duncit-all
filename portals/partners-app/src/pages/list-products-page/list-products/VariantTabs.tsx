import { Box, Button, Stack, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import { DuncitTabs, useTabParam } from '@duncit/tabs';
import { useFieldArray, type Control, type Path, type UseFormSetValue, type UseFormWatch } from 'react-hook-form';
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
  // Own key — the wizard step this sits in is not itself a tab strip, but a
  // variant index only means something next to this list, so it stays scoped.
  // Index-valued for once: nothing else names a variant. `key` carries the
  // field id so React is not handed an index as a key.
  const tabs = useTabParam<number>({
    items: fields.map((field, index) => ({
      value: index,
      key: field.id,
      label:
        (watch(`variants.${index}.option_label` as Path<ProductListingValues>) as string) ||
        `Variant ${index + 1}`,
    })),
    fallback: 0,
    param: 'selectedtab_variant',
  });
  const current = tabs.value;
  const setActive = tabs.onChange;

  const addVariant = () => {
    append({ ...emptyVariant });
    setActive(fields.length);
  };
  const removeVariant = (index: number) => {
    remove(index);
    setActive(Math.max(0, Math.min(current, fields.length - 2)));
  };

  return (
    <Stack spacing={1.5}>
      <Typography variant="subtitle2" sx={{
        fontWeight: 800
      }}>
        Variants
      </Typography>
      <Typography variant="caption" sx={{
        color: "text.secondary"
      }}>
        Each variant carries its own images, description, size, dimensions, price and stock.
      </Typography>
      <DuncitTabs {...tabs} variant="scrollable" scrollButtons="auto" />
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
