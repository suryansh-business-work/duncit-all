import { Stack } from '@mui/material';
import FormDialog from '../../../components/FormDialog';
import type { ListFormProps } from '../../../components/ListEditorPage';
import { IdentityFields } from '../../../components/form/IdentityFields';
import RhfImageField from '../../../components/form/RhfImageField';
import RhfMultiSelect from '../../../components/form/RhfMultiSelect';
import RhfSwitch from '../../../components/form/RhfSwitch';
import { useSchemaForm } from '../../../components/form/useSchemaForm';
import type { StorePetType } from '../../../queries/taxonomy';
import { useTaxonomyOptions } from '../../../queries/useTaxonomyOptions';
import { makePetTypeSchema, toPetTypeValues, type PetTypeValues } from './pet-type.types';

/** Create or edit one pet type — the top-level way the store is browsed (Dogs, Cats…) — and the aisles under it. */
export default function PetTypeForm({ initial, busy, onClose, onSubmit }: Readonly<ListFormProps<StorePetType>>) {
  const { t, form } = useSchemaForm<PetTypeValues>(makePetTypeSchema, toPetTypeValues(initial));
  const { control, handleSubmit } = form;
  const { categoryOptions } = useTaxonomyOptions();
  return (
    <FormDialog
      formId="pet-type-form"
      title={initial ? t('ecommPortal.petTypes.editTitle') : t('ecommPortal.petTypes.newTitle')}
      busy={busy}
      onClose={onClose}
      onSubmit={handleSubmit(onSubmit)}
    >
      <Stack spacing={1} data-testid="pet-type-form">
        <IdentityFields control={control} />
        <RhfImageField control={control} name="icon_url" label={t('ecommPortal.form.icon')} hint={t('ecommPortal.petTypes.iconHint')} testId="pet-type-icon" />
        <RhfImageField control={control} name="image_url" label={t('ecommPortal.form.image')} testId="pet-type-image" />
        <RhfMultiSelect
          control={control}
          name="category_ids"
          label={t('ecommPortal.petTypes.categories')}
          options={categoryOptions}
          hint={t('ecommPortal.petTypes.categoriesHint')}
          testId="pet-type-categories"
        />
        <RhfSwitch control={control} name="is_active" label={t('shell.common.active')} hint={t('ecommPortal.form.activeHint')} testId="pet-type-active" />
      </Stack>
    </FormDialog>
  );
}
