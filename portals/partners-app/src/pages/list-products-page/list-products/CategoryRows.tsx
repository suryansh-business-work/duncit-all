import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import type { Control } from 'react-hook-form';
import { RhfAdminCategoryRows } from '@duncit/category';
import type { ProductListingValues } from './list-products.types';
import { useTranslation } from '@duncit/shell';

// Step 1 of the wizard: pick one or more Super → Category → Sub rows the product
// is sold in. The rows are the shared @duncit/category field; a product surfaces
// only in pods whose category matches one of these rows (full Super→Category→Sub).
// A product has no primary category, and a repeated row was never flagged here,
// so the field's optional primary mark and duplicate flag are both left off.
export default function CategoryRows({ control }: Readonly<{ control: Control<ProductListingValues> }>) {
  const { t } = useTranslation();
  return (
    <RhfAdminCategoryRows
      control={control}
      name="categories"
      required
      size="medium"
      legend="Which categories do you want to sell your product in?"
      hint="Add one or more Super → Category → Sub rows. Your product only appears in pods that match one of them."
      labels={{ add: 'Add category', remove: () => t('partners.listProductsPage.removeCategory') }}
      icons={{ add: <AddIcon />, remove: <DeleteOutlineIcon /> }}
      components={{ Button: DuncitButton, IconButton: DuncitIconButton }}
    />
  );
}
