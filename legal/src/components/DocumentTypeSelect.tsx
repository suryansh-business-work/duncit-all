import { Autocomplete, TextField } from '@mui/material';
import { DOCUMENT_TYPE_OPTIONS, type DocumentTypeOption } from '../config/documentTypes';

interface Props {
  value: string;
  onChange: (value: string) => void;
  label?: string;
}

/** Grouped, searchable picker over the canonical legal document-type list. */
export default function DocumentTypeSelect({ value, onChange, label = 'Document Type' }: Readonly<Props>) {
  const selected = DOCUMENT_TYPE_OPTIONS.find((o) => o.label === value) ?? null;
  return (
    <Autocomplete<DocumentTypeOption>
      options={DOCUMENT_TYPE_OPTIONS}
      groupBy={(o) => o.group}
      getOptionLabel={(o) => o.label}
      isOptionEqualToValue={(o, v) => o.label === v.label}
      value={selected}
      onChange={(_e, v) => onChange(v?.label ?? '')}
      fullWidth
      renderInput={(params) => (
        <TextField {...params} label={label} placeholder="Search document type…" />
      )}
    />
  );
}
