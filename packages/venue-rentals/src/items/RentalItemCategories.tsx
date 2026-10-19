import type { Control } from 'react-hook-form';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import { useTranslation } from '@duncit/app-settings';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import { RhfAdminCategoryRows } from '@duncit/category';
import type { RentalItemsValues } from '@duncit/utils';
import type { RentalItemsOutput } from '@duncit/forms/schemas';

interface Props {
  control: Control<RentalItemsValues, unknown, RentalItemsOutput>;
  index: number;
  /** The server's cap (`venueRegistrationConfig.rental_category_limit`). */
  max: number;
  testId: string;
}

/**
 * The pods an item is offered on: one or more chained Super → Category → Sub
 * rows from the admin category tree. A pod shows the item only when its club's
 * category is one of them, so a venue's racket never reaches its book club.
 */
export default function RentalItemCategories({ control, index, max, testId }: Readonly<Props>) {
  const { t } = useTranslation();
  return (
    <RhfAdminCategoryRows
      control={control}
      name={`items.${index}.categories`}
      legend={t('venueRentals.items.categories')}
      hint={t('venueRentals.items.categoriesHint')}
      strict
      required
      max={max}
      direction={{ xs: 'column', md: 'row' }}
      levelLabels={{
        super: t('venueRentals.items.superCategory'),
        category: t('venueRentals.items.category'),
        sub: t('venueRentals.items.subCategory'),
      }}
      labels={{
        add: t('venueRentals.items.addCategory'),
        remove: (n) => t('venueRentals.items.removeCategory', { vars: { n } }),
        row: (n) => t('venueRentals.items.categoryRow', { vars: { n } }),
        duplicate: t('venueRentals.items.categoryDuplicate'),
        maxReached: t('venueRentals.items.categoryMaxReached'),
      }}
      icons={{ add: <AddIcon />, remove: <DeleteOutlinedIcon /> }}
      components={{ Button: DuncitButton, IconButton: DuncitIconButton }}
      testId={testId}
    />
  );
}
