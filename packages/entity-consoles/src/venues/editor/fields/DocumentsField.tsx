import { MenuItem, Stack } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import { DuncitButton, DuncitIconButton } from '@duncit/buttons';
import { RhfTextField } from '@duncit/forms';
import { useFieldArray, type Control } from 'react-hook-form';
import { useTranslation } from '@duncit/shell';
import MediaUrlField from './MediaUrlField';
import type { VenueFormValues } from '../types';

/**
 * The venue's paperwork: a type from the server's catalogue, and the file.
 *
 * Admin edits REPLACE the document list (the server's `adminUpdateVenue` sets
 * it outright), unlike the owner's own edit which may only append — which is
 * exactly why removing one is possible here and nowhere else.
 */
export default function DocumentsField({
  control,
  docTypes,
  onPick,
}: Readonly<{
  control: Control<VenueFormValues>;
  docTypes: readonly string[];
  onPick: () => Promise<string | null>;
}>) {
  const { t } = useTranslation();
  const { fields, append, remove } = useFieldArray({ control, name: 'documents' });

  return (
    <Stack spacing={1}>
      {fields.map((row, index) => (
        <Stack
          key={row.id}
          direction={{ xs: 'column', md: 'row' }}
          spacing={1}
          sx={{ alignItems: 'flex-start' }}
        >
          <RhfTextField
            control={control}
            name={`documents.${index}.type`}
            label={t('directory.venueEditor.documentType')}
            size="small"
            select
            sx={{ minWidth: 220 }}
          >
            {docTypes.map((type) => (
              <MenuItem key={type} value={type}>
                {type}
              </MenuItem>
            ))}
          </RhfTextField>
          <MediaUrlField
            control={control}
            name={`documents.${index}.url`}
            label={t('directory.venueEditor.documentFile')}
            onPick={onPick}
            pickLabel={t('directory.venueEditor.upload')}
          />
          <DuncitIconButton
            aria-label={t('directory.venueEditor.removeDocument')}
            onClick={() => remove(index)}
            sx={{ mt: 0.5 }}
          >
            <DeleteOutlineIcon fontSize="small" />
          </DuncitIconButton>
        </Stack>
      ))}
      <DuncitButton
        startIcon={<AddIcon />}
        onClick={() => append({ type: '', url: '' })}
        sx={{ alignSelf: 'flex-start' }}
      >
        {t('directory.venueEditor.addDocument')}
      </DuncitButton>
    </Stack>
  );
}
