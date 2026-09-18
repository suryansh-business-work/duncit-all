import { Stack, Typography } from '@mui/material';
import FormDialog from '../../../components/FormDialog';
import RhfMultiSelect from '../../../components/form/RhfMultiSelect';
import { useSchemaForm } from '../../../components/form/useSchemaForm';
import { useTaxonomyOptions } from '../../../queries/useTaxonomyOptions';
import { BULK_FILE_DEFAULTS, makeBulkFileSchema, type BulkFileValues } from './bulk-file.types';

interface BulkFileFormProps {
  count: number;
  busy: boolean;
  onClose: () => void;
  onSubmit: (values: BulkFileValues) => Promise<void>;
}

/** File the ticked products under more pet types and categories — added to what they already have, never replacing it. */
export default function BulkFileForm({ count, busy, onClose, onSubmit }: Readonly<BulkFileFormProps>) {
  const { t, form } = useSchemaForm<BulkFileValues>(makeBulkFileSchema, BULK_FILE_DEFAULTS);
  const { control, handleSubmit } = form;
  const taxonomy = useTaxonomyOptions();
  return (
    <FormDialog
      formId="bulk-file-form"
      title={t('ecommPortal.products.fileTitle', { count })}
      busy={busy}
      onClose={onClose}
      onSubmit={handleSubmit(onSubmit)}
      submitLabel={t('ecommPortal.products.file')}
    >
      <Stack spacing={1}>
        <Typography variant="body2" sx={{ color: 'text.secondary', pb: 1 }}>
          {t('ecommPortal.products.fileHint')}
        </Typography>
        <RhfMultiSelect control={control} name="pet_type_ids" label={t('ecommPortal.nav.petTypes')} options={taxonomy.petTypeOptions} />
        <RhfMultiSelect control={control} name="category_ids" label={t('ecommPortal.nav.categories')} options={taxonomy.categoryOptions} />
      </Stack>
    </FormDialog>
  );
}
