import { useMemo } from 'react';
import { Divider, MenuItem, Stack } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import FormDialog from '../../../components/FormDialog';
import type { ListFormProps } from '../../../components/ListEditorPage';
import { IdentityFields, SeoFields } from '../../../components/form/IdentityFields';
import RhfImageField from '../../../components/form/RhfImageField';
import RhfMultiSelect from '../../../components/form/RhfMultiSelect';
import RhfSwitch from '../../../components/form/RhfSwitch';
import { useSchemaForm } from '../../../components/form/useSchemaForm';
import { parentOptions } from '../../../lib/taxonomy';
import type { Option } from '../../../lib/translate';
import type { StoreCategory } from '../../../queries/taxonomy';
import { makeCategorySchema, ROOT_PARENT, toCategoryInput, toCategoryValues, type CategoryValues } from './category.types';

interface CategoryFormProps extends ListFormProps<StoreCategory> {
  categories: readonly StoreCategory[];
  petTypeOptions: readonly Option[];
}

/** Create or edit one aisle of the store, and where it sits in the menu. */
export default function CategoryForm({
  initial,
  busy,
  onClose,
  onSubmit,
  categories,
  petTypeOptions,
}: Readonly<CategoryFormProps>) {
  const { t, form } = useSchemaForm<CategoryValues>(makeCategorySchema, toCategoryValues(initial));
  const { control, handleSubmit } = form;
  const parents = useMemo(() => parentOptions(categories, initial?.id ?? null), [categories, initial]);
  return (
    <FormDialog
      formId="category-form"
      title={initial ? t('ecommPortal.categories.editTitle') : t('ecommPortal.categories.newTitle')}
      busy={busy}
      onClose={onClose}
      onSubmit={handleSubmit((values) => onSubmit(toCategoryInput(values)))}
      maxWidth="md"
    >
      <Stack spacing={1} data-testid="category-form">
        <IdentityFields control={control} />
        <RhfTextField control={control} name="parent_id" label={t('ecommPortal.categories.parent')} select required data-testid="category-parent">
          <MenuItem value={ROOT_PARENT}>{t('ecommPortal.categories.topLevel')}</MenuItem>
          {parents.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </RhfTextField>
        <RhfMultiSelect
          control={control}
          name="pet_type_ids"
          label={t('ecommPortal.nav.petTypes')}
          options={petTypeOptions}
          hint={t('ecommPortal.categories.petTypesHint')}
          required
          testId="category-pet-types"
        />
        <RhfImageField
          control={control}
          name="image_url"
          label={t('ecommPortal.form.image')}
          hint={t('ecommPortal.categories.imageHint')}
          required
          testId="category-image"
        />
        <RhfImageField
          control={control}
          name="banner_url"
          label={t('ecommPortal.form.banner')}
          hint={t('ecommPortal.categories.bannerHint')}
          required
          testId="category-banner"
        />
        <RhfSwitch control={control} name="is_active" label={t('shell.common.active')} hint={t('ecommPortal.form.activeHint')} testId="category-active" />
        <RhfSwitch control={control} name="show_in_menu" label={t('ecommPortal.categories.showInMenu')} testId="category-show-in-menu" />
        <Divider />
        <SeoFields control={control} required />
      </Stack>
    </FormDialog>
  );
}
