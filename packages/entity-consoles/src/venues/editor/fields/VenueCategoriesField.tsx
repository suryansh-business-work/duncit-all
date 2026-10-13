import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import { RhfAdminCategoryRows } from '@duncit/category';
import { useTranslation } from '@duncit/shell';
import type { Control } from 'react-hook-form';
import { categoryLimitMessage } from '../schema';
import type { VenueFormValues } from '../types';

/**
 * Every category the venue hosts pods in — one row of the shared cascading
 * picker each, the first being the primary.
 *
 * The same `RhfAdminCategoryRows` the owner's registration form uses, so the two
 * forms cannot drift into two ideas of what a venue's categories look like. Two
 * things differ on purpose, both staff leniency: no row is required (staff
 * register a venue from partial information), and `min` is whatever the caller
 * passes — one for a venue that already has categories, because an empty list
 * leaves the stored ones alone and removing the last row would be an edit that
 * did not save.
 */
export default function VenueCategoriesField({
  control,
  limit,
  min,
}: Readonly<{
  control: Control<VenueFormValues>;
  /** `venueRegistrationConfig.category_limit` — the most one venue may have. */
  limit: number;
  /** A row cannot be removed at or below this many. */
  min: number;
}>) {
  const { t } = useTranslation();

  return (
    <RhfAdminCategoryRows
      control={control}
      name="categories"
      testId="venue-categories"
      direction={{ xs: 'column', md: 'row' }}
      min={min}
      max={limit}
      legend={t('directory.venueEditor.categories')}
      hint={t('directory.venueEditor.categoriesHint')}
      labels={{
        add: t('directory.venueEditor.categoryAdd'),
        remove: (n) => t('directory.venueEditor.categoryRemove', { vars: { n } }),
        row: (n) => t('directory.venueEditor.categoryRow', { vars: { n } }),
        primary: t('directory.venueEditor.categoryPrimary'),
        duplicate: t('directory.venueEditor.categoryDuplicate'),
        maxReached: categoryLimitMessage(t, limit),
      }}
      icons={{ add: <AddIcon />, remove: <DeleteOutlineIcon /> }}
      components={{ Button: DuncitButton, IconButton: DuncitIconButton }}
    />
  );
}
