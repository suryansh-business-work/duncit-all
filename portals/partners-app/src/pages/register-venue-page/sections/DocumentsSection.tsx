import { useState } from 'react';
import { Controller, useFieldArray, type UseFormReturn } from 'react-hook-form';
import {
  Box,
  Button,
  Chip,
  FormHelperText,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import MediaPickerDialog from '../../../components/MediaPickerDialog';
import type { RegisterVenueMode, RegisterVenueValues, VenueRegistrationConfig } from '../register-venue';

interface Props {
  form: UseFormReturn<RegisterVenueValues>;
  config: VenueRegistrationConfig;
  mode: RegisterVenueMode;
  /** How many documents the venue already had — in edit-approved mode those
   * rows are locked (append-only: new documents can be added, never removed). */
  lockedDocCount?: number;
}

/** Dynamic document list: each row pairs a document type with a PDF upload. */
export default function DocumentsSection({ form, config, mode, lockedDocCount = 0 }: Readonly<Props>) {
  const { control, setValue, watch, formState } = form;
  const { fields, append, remove } = useFieldArray({ control, name: 'documents' });
  const [pickerIndex, setPickerIndex] = useState<number | null>(null);
  const documents = watch('documents');
  const listError = formState.errors.documents?.root?.message ?? formState.errors.documents?.message;
  const approvedEdit = mode === 'edit-approved';
  const isRowLocked = (index: number) => approvedEdit && index < lockedDocCount;

  return (
    <Stack spacing={2.5}>
      <Controller
        name="gstin"
        control={control}
        render={({ field, fieldState }) => (
          <TextField
            {...field}
            label="GSTIN (optional)"
            disabled={approvedEdit}
            error={Boolean(fieldState.error)}
            helperText={fieldState.error?.message ?? (approvedEdit ? 'Locked after approval' : '15-character GST number, e.g. 22ABCDE1234F1Z5')}
          />
        )}
      />
      <Controller
        name="pan"
        control={control}
        render={({ field, fieldState }) => (
          <TextField
            {...field}
            label="PAN (optional)"
            disabled={approvedEdit}
            error={Boolean(fieldState.error)}
            helperText={fieldState.error?.message ?? (approvedEdit ? 'Locked after approval' : '10-character PAN, e.g. ABCDE1234F')}
          />
        )}
      />
      <Box>
        <Typography variant="subtitle2" fontWeight={800}>
          Documents{' '}
          <Typography component="span" variant="caption" color="error.main" fontWeight={800}>
            (required)
          </Typography>
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {approvedEdit
            ? 'Verified documents are locked — you can add new documents, not replace them. PDF only, max 50 MB.'
            : 'Upload at least one document with its type. PDF only, max 50 MB.'}
        </Typography>
      </Box>
      {typeof listError === 'string' && listError && <FormHelperText error>{listError}</FormHelperText>}
      {fields.map((row, index) => (
        <Stack key={row.id} spacing={0.5}>
          <Stack direction="row" spacing={1} alignItems="flex-start">
            <Controller
              name={`documents.${index}.type`}
              control={control}
              render={({ field, fieldState }) => (
                <TextField
                  {...field}
                  select
                  label="Document type"
                  size="small"
                  disabled={isRowLocked(index)}
                  sx={{ minWidth: 180 }}
                  error={Boolean(fieldState.error)}
                  helperText={fieldState.error?.message ?? (isRowLocked(index) ? 'Verified document' : ' ')}
                >
                  {config.doc_types.map((type) => (
                    <MenuItem key={type} value={type}>
                      {type}
                    </MenuItem>
                  ))}
                </TextField>
              )}
            />
            {documents[index]?.url ? (
              <Chip
                label="Uploaded"
                color="success"
                size="small"
                onClick={() => window.open(documents[index].url, '_blank')}
                onDelete={
                  isRowLocked(index)
                    ? undefined
                    : () => setValue(`documents.${index}.url`, '', { shouldDirty: true, shouldValidate: true })
                }
              />
            ) : (
              <Button size="small" startIcon={<UploadFileIcon />} variant="outlined" onClick={() => setPickerIndex(index)}>
                Upload file
              </Button>
            )}
            {!isRowLocked(index) && (
              <IconButton size="small" aria-label="Remove document" onClick={() => remove(index)}>
                <DeleteIcon />
              </IconButton>
            )}
          </Stack>
          {formState.errors.documents?.[index]?.url && (
            <FormHelperText error>{formState.errors.documents[index]?.url?.message}</FormHelperText>
          )}
        </Stack>
      ))}
      <Button
        startIcon={<AddIcon />}
        onClick={() => append({ type: config.doc_types[0] ?? '', url: '' })}
        sx={{ alignSelf: 'flex-start' }}
      >
        Add document
      </Button>
      <MediaPickerDialog
        open={pickerIndex !== null}
        onClose={() => setPickerIndex(null)}
        onPicked={(url) => {
          if (pickerIndex === null) return;
          setValue(`documents.${pickerIndex}.url`, url, { shouldDirty: true, shouldValidate: true });
          setPickerIndex(null);
        }}
        folder="/venues/docs"
        title="Upload document (PDF, max 50 MB)"
        accept="application/pdf"
      />
    </Stack>
  );
}
