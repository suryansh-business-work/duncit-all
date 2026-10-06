import { useFieldArray, type Control } from 'react-hook-form';
import { FormLabel, Stack } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import type { EntryFormValues } from './entry.types';

/**
 * Collection-specific details as key/value pairs — a job's location and type,
 * a case study's client and result. Templates show one with
 * {field:location}, so a collection grows a field without a schema change.
 */
export default function EntryCustomFields({ control }: Readonly<{ control: Control<EntryFormValues> }>) {
  const { t } = useTranslation();
  const { fields, append, remove } = useFieldArray({ control, name: 'fields' });

  return (
    <Stack spacing={1} role="group" aria-labelledby="cms-entry-fields">
      <FormLabel id="cms-entry-fields">{t('websiteApp.cms.entryForm.fields')}</FormLabel>
      {fields.map((field, index) => (
        <Stack key={field.id} direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ alignItems: { sm: 'flex-start' } }}>
          <RhfTextField control={control} name={`fields.${index}.key`} size="small" label={t('websiteApp.cms.entryForm.fieldKey')} sx={{ maxWidth: { sm: 220 } }} />
          <RhfTextField control={control} name={`fields.${index}.value`} size="small" label={t('websiteApp.cms.entryForm.fieldValue')} />
          <DuncitIconButton aria-label={t('websiteApp.cms.entryForm.removeField')} onClick={() => remove(index)} sx={{ mt: 0.5 }}>
            <DeleteOutlineIcon fontSize="small" />
          </DuncitIconButton>
        </Stack>
      ))}
      <DuncitButton size="small" startIcon={<AddIcon />} onClick={() => append({ key: '', value: '' })} sx={{ alignSelf: 'flex-start' }}>
        {t('websiteApp.cms.entryForm.addField')}
      </DuncitButton>
    </Stack>
  );
}
