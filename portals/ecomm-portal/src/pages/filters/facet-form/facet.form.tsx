import { FormHelperText, Stack, Typography } from '@mui/material';
import FormDialog from '../../../components/FormDialog';
import type { ListFormProps } from '../../../components/ListEditorPage';
import RhfFieldList from '../../../components/form/FieldList';
import { IdentityFields } from '../../../components/form/IdentityFields';
import RhfSwitch from '../../../components/form/RhfSwitch';
import { useSchemaForm } from '../../../components/form/useSchemaForm';
import type { StoreFacet } from '../../../queries/taxonomy';
import { BLANK_FACET_OPTION, makeFacetSchema, toFacetValues, type FacetValues } from './facet.types';

/** Create or edit one shopper filter (Life stage, Flavour…) and the options it offers. */
export default function FacetForm({ initial, busy, onClose, onSubmit }: Readonly<ListFormProps<StoreFacet>>) {
  const { t, form } = useSchemaForm<FacetValues>(makeFacetSchema, toFacetValues(initial));
  const { control, handleSubmit, formState } = form;
  const optionsError = formState.errors.options?.root?.message ?? formState.errors.options?.message;
  return (
    <FormDialog
      formId="facet-form"
      title={initial ? t('ecommPortal.filters.editTitle') : t('ecommPortal.filters.newTitle')}
      busy={busy}
      onClose={onClose}
      onSubmit={handleSubmit(onSubmit)}
      maxWidth="md"
    >
      <Stack spacing={1}>
        <IdentityFields control={control} withDescription={false} />
        <RhfSwitch control={control} name="is_active" label={t('shell.common.active')} hint={t('ecommPortal.form.activeHint')} />
        <Typography component="h3" variant="subtitle2">
          {t('ecommPortal.filters.options')}
        </Typography>
        <RhfFieldList
          control={control}
          name="options"
          blank={BLANK_FACET_OPTION}
          columns={[
            { key: 'label', label: t('ecommPortal.filters.optionLabel') },
            { key: 'slug', label: t('ecommPortal.form.slug') },
          ]}
          addLabel={t('ecommPortal.filters.addOption')}
          itemLabel={(position) => t('ecommPortal.filters.optionN', { vars: { n: position } })}
        />
        {optionsError && <FormHelperText error>{optionsError}</FormHelperText>}
      </Stack>
    </FormDialog>
  );
}
