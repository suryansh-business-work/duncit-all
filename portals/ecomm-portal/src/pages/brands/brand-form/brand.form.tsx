import { Stack } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import FormDialog from '../../../components/FormDialog';
import type { ListFormProps } from '../../../components/ListEditorPage';
import { IdentityFields } from '../../../components/form/IdentityFields';
import RhfImageField from '../../../components/form/RhfImageField';
import RhfSwitch from '../../../components/form/RhfSwitch';
import { useSchemaForm } from '../../../components/form/useSchemaForm';
import type { StoreBrand } from '../../../queries/taxonomy';
import { makeBrandSchema, toBrandValues, type BrandValues } from './brand.types';

/** Create or edit one of the store's own brands — what its products are made by. */
export default function BrandForm({ initial, busy, onClose, onSubmit }: Readonly<ListFormProps<StoreBrand>>) {
  const { t, form } = useSchemaForm<BrandValues>(makeBrandSchema, toBrandValues(initial));
  const { control, handleSubmit } = form;
  return (
    <FormDialog
      formId="brand-form"
      title={initial ? t('ecommPortal.brands.editTitle') : t('ecommPortal.brands.newTitle')}
      busy={busy}
      onClose={onClose}
      onSubmit={handleSubmit(onSubmit)}
    >
      <Stack spacing={1} data-testid="brand-form">
        <IdentityFields control={control} />
        <RhfTextField
          control={control}
          name="tagline"
          label={t('ecommPortal.brands.tagline')}
          hint={t('ecommPortal.brands.taglineHint')}
          data-testid="brand-tagline"
        />
        <RhfImageField control={control} name="logo_url" label={t('ecommPortal.brands.logo')} hint={t('ecommPortal.brands.logoHint')} testId="brand-logo" />
        <RhfSwitch control={control} name="is_active" label={t('shell.common.active')} hint={t('ecommPortal.form.activeHint')} testId="brand-active" />
      </Stack>
    </FormDialog>
  );
}
