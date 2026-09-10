import { Alert, Stack } from '@mui/material';
import CategoryIcon from '@mui/icons-material/Category';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import { RhfAdminCategory } from '@duncit/category';
import { useTranslation } from '@duncit/shell';
import { useFieldArray, type Control } from 'react-hook-form';
import SectionCard from '../../../venues/detail/SectionCard';
import { blankHostCategory, type HostFormValues } from '../types';

/**
 * What this host is approved to run — one Super → Category → Sub triple per row.
 *
 * A host may hold several: an approved Host Request seeds one each, and the
 * console is where an admin adds or withdraws one afterwards. Saving replaces the
 * whole set (the server's `categories` argument is a replace, not a merge), which
 * is why removing a row here is how a category is taken away.
 */
export default function CategoriesSection({
  control,
}: Readonly<{ control: Control<HostFormValues> }>) {
  const { t } = useTranslation();
  const { fields, append, remove } = useFieldArray({ control, name: 'categories' });

  return (
    <SectionCard
      icon={<CategoryIcon color="primary" />}
      title={t('directory.hostEditor.categories')}
    >
      <Stack spacing={1.5}>
        <Alert severity="info" variant="outlined">
          {t('directory.hostEditor.categoriesHint')}
        </Alert>
        {fields.map((row, index) => (
          <Stack key={row.id} direction="row" spacing={1} sx={{ alignItems: 'flex-start' }}>
            <RhfAdminCategory
              control={control}
              name={`categories.${index}`}
              direction={{ xs: 'column', md: 'row' }}
              required
            />
            <DuncitIconButton
              aria-label={t('directory.hostEditor.removeCategory')}
              onClick={() => remove(index)}
              sx={{ mt: 0.5 }}
            >
              <DeleteOutlineIcon fontSize="small" />
            </DuncitIconButton>
          </Stack>
        ))}
        <DuncitButton
          startIcon={<AddIcon />}
          sx={{ alignSelf: 'flex-start' }}
          onClick={() => append(blankHostCategory)}
        >
          {t('directory.hostEditor.addCategory')}
        </DuncitButton>
      </Stack>
    </SectionCard>
  );
}
