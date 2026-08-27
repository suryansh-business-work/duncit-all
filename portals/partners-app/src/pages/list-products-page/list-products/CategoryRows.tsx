import { Box, Stack } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import { useFieldArray, type Control, type Path } from 'react-hook-form';
import { EMPTY_CATEGORY, Fieldset, RhfAdminCategory } from '@duncit/category';
import type { ProductListingValues } from './list-products.types';
import { useTranslation } from '@duncit/shell';

// Step 1 of the wizard: pick one or more Super → Category → Sub rows the product
// is sold in. Each row is the shared @duncit/category cascade; a product surfaces
// only in pods whose category matches one of these rows (full Super→Category→Sub).
export default function CategoryRows({ control }: Readonly<{ control: Control<ProductListingValues> }>) {
  const { t } = useTranslation();
  const { fields, append, remove } = useFieldArray({ control, name: 'categories' });
  return (
    <Fieldset
      legend="Which categories do you want to sell your product in?"
      hint="Add one or more Super → Category → Sub rows. Your product only appears in pods that match one of them."
    >
      <Stack spacing={2}>
        {fields.map((field, index) => (
          <Stack key={field.id} direction="row" spacing={1} sx={{
            alignItems: "flex-start"
          }}>
            <Box sx={{ flex: 1 }}>
              <RhfAdminCategory
                control={control}
                name={`categories.${index}` as Path<ProductListingValues>}
                required
                size="medium"
              />
            </Box>
            <DuncitIconButton
              aria-label={t('partners.listProductsPage.removeCategory')}
              color="error"
              disabled={fields.length <= 1}
              onClick={() => remove(index)}
              sx={{ mt: 1 }}
            >
              <DeleteOutlineIcon />
            </DuncitIconButton>
          </Stack>
        ))}
        <DuncitButton
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={() => append({ ...EMPTY_CATEGORY })}
          sx={{ alignSelf: 'flex-start' }}
        >
          Add category
        </DuncitButton>
      </Stack>
    </Fieldset>
  );
}
