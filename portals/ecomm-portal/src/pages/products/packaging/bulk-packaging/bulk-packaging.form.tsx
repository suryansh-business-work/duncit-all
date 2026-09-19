import { Alert, Stack } from '@mui/material';
import { PackagingFields } from '@duncit/forms';
import FormDialog from '../../../../components/FormDialog';
import { useSchemaForm } from '../../../../components/form/useSchemaForm';
import type { PackagingInput } from '../packaging-queries';
import {
  BULK_PACKAGING_DEFAULTS,
  makeBulkPackagingSchema,
  toBulkPackagingInput,
  type BulkPackagingValues,
} from './bulk-packaging.types';

interface BulkPackagingFormProps {
  count: number;
  busy: boolean;
  onClose: () => void;
  onSubmit: (input: PackagingInput) => Promise<boolean>;
}

/** The same packaging on every ticked product; a blank value keeps what each one has. */
export default function BulkPackagingForm({ count, busy, onClose, onSubmit }: Readonly<BulkPackagingFormProps>) {
  const { t, form } = useSchemaForm<BulkPackagingValues>(makeBulkPackagingSchema, BULK_PACKAGING_DEFAULTS);
  const { control, setValue, handleSubmit } = form;
  const submit = handleSubmit(async (values) => {
    if (await onSubmit(toBulkPackagingInput(values))) onClose();
  });
  return (
    <FormDialog
      formId="bulk-packaging-form"
      title={t('ecommPortal.products.bulkPackagingTitle', { count })}
      busy={busy}
      onClose={onClose}
      onSubmit={submit}
      submitLabel={t('ecommPortal.products.setPackaging')}
      maxWidth="md"
    >
      <Stack spacing={2}>
        <Alert severity="info">{t('ecommPortal.products.bulkPackagingHint')}</Alert>
        <PackagingFields control={control} setValue={setValue} t={t} />
      </Stack>
    </FormDialog>
  );
}
