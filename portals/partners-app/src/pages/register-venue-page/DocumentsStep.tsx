import { useMemo } from 'react';
import { Button, Chip, FormHelperText, IconButton, MenuItem, Stack, TextField, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { DOC_TYPES, type DocRow, type VenueStep2 } from './types';
import { getStepErrors, venueStep2Schema } from './register-venue.form';

interface Props {
  value: VenueStep2;
  onChange: (next: VenueStep2) => void;
  onDocPick: (index: number) => void;
  showAllErrors?: boolean;
}

export default function DocumentsStep({ value, onChange, onDocPick, showAllErrors }: Readonly<Props>) {
  const errors = useMemo(() => getStepErrors(venueStep2Schema, value) as Record<string, string>, [value]);
  const docError = showAllErrors ? errors.documents : '';
  const setDoc = (index: number, patch: Partial<DocRow>) => {
    const documents = [...value.documents];
    documents[index] = { ...documents[index], ...patch };
    onChange({ ...value, documents });
  };

  return (
    <Stack spacing={2.5}>
      <TextField label="GSTIN (optional)" value={value.gstin} onChange={(e) => onChange({ ...value, gstin: e.target.value })} error={showAllErrors && !!errors.gstin} helperText={showAllErrors ? errors.gstin || ' ' : ' '} />
      <TextField label="PAN (optional)" value={value.pan} onChange={(e) => onChange({ ...value, pan: e.target.value })} error={showAllErrors && !!errors.pan} helperText={showAllErrors ? errors.pan || ' ' : ' '} />
      <Typography variant="subtitle2">Documents</Typography>
      {docError && <FormHelperText error>{docError}</FormHelperText>}
      {value.documents.map((doc, index) => (
        <Stack key={index} spacing={0.5}>
          <Stack direction="row" spacing={1} alignItems="flex-start">
            <TextField select label="Type" size="small" value={doc.type || DOC_TYPES[0]} sx={{ minWidth: 160 }} onChange={(e) => setDoc(index, { type: e.target.value })} error={showAllErrors && !!errors[`documents[${index}].type`]} helperText={showAllErrors ? errors[`documents[${index}].type`] || ' ' : ' '}>
              {DOC_TYPES.map((type) => <MenuItem key={type} value={type}>{type}</MenuItem>)}
            </TextField>
            {doc.url ? (
              <Chip label="Uploaded" color="success" size="small" onClick={() => window.open(doc.url, '_blank')} onDelete={() => setDoc(index, { url: '' })} />
            ) : (
              <Button size="small" startIcon={<UploadFileIcon />} variant="outlined" onClick={() => onDocPick(index)}>Upload file</Button>
            )}
            <IconButton size="small" onClick={() => onChange({ ...value, documents: value.documents.filter((_, itemIndex) => itemIndex !== index) })}>
              <DeleteIcon />
            </IconButton>
          </Stack>
          {showAllErrors && errors[`documents[${index}].url`] && <FormHelperText error>{errors[`documents[${index}].url`]}</FormHelperText>}
        </Stack>
      ))}
      <Button startIcon={<AddIcon />} onClick={() => onChange({ ...value, documents: [...value.documents, { type: DOC_TYPES[0], url: '' }] })}>
        Add document
      </Button>
    </Stack>
  );
}