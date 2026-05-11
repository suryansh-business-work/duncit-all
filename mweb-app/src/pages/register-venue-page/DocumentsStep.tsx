import { Alert, Button, Chip, IconButton, MenuItem, Stack, TextField, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import { DOC_TYPES, type DocRow, type VenueStep2 } from './types';

interface Props {
  value: VenueStep2;
  onChange: (next: VenueStep2) => void;
  onDocPick: (index: number) => void;
}

export default function DocumentsStep({ value, onChange, onDocPick }: Props) {
  const setDoc = (index: number, patch: Partial<DocRow>) => {
    const documents = [...value.documents];
    documents[index] = { ...documents[index], ...patch };
    onChange({ ...value, documents });
  };

  return (
    <Stack spacing={2}>
      <TextField label="GSTIN (optional)" value={value.gstin} onChange={(e) => onChange({ ...value, gstin: e.target.value })} />
      <TextField label="PAN (optional)" value={value.pan} onChange={(e) => onChange({ ...value, pan: e.target.value })} />
      <Typography variant="subtitle2">Documents</Typography>
      {value.documents.length === 0 && <Alert severity="info">Upload at least one supporting document.</Alert>}
      {value.documents.map((doc, index) => (
        <Stack key={index} direction="row" spacing={1} alignItems="flex-start">
          <TextField select label="Type" size="small" value={doc.type || DOC_TYPES[0]} sx={{ minWidth: 160 }} onChange={(e) => setDoc(index, { type: e.target.value })}>
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
      ))}
      <Button startIcon={<AddIcon />} onClick={() => onChange({ ...value, documents: [...value.documents, { type: DOC_TYPES[0], url: '' }] })}>
        Add document
      </Button>
    </Stack>
  );
}