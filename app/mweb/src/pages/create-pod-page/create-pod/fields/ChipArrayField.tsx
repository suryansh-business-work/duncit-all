import { useState, type KeyboardEvent } from 'react';
import { Box, Chip, Stack, TextField, Typography } from '@mui/material';
import { requiredLabel } from '../../../../forms/components/requiredLabel';

interface Props {
  label: string;
  required?: boolean;
  value: string[];
  onChange: (next: string[]) => void;
  helperText?: string;
  placeholder?: string;
  max?: number;
  error?: string;
}

/** Enter-to-add chip list backed by a string[] form field. */
export default function ChipArrayField({
  label,
  required,
  value,
  onChange,
  helperText,
  placeholder = 'Type and press Enter',
  max = 20,
  error,
}: Readonly<Props>) {
  const [draft, setDraft] = useState('');

  const commit = () => {
    const next = draft.trim();
    if (!next || value.includes(next) || value.length >= max) {
      setDraft('');
      return;
    }
    onChange([...value, next]);
    setDraft('');
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      commit();
    } else if (e.key === 'Backspace' && !draft && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };

  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 0.75 }}>
        {requiredLabel(label, required)}
      </Typography>
      {value.length > 0 && (
        <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
          {value.map((tag) => (
            <Chip key={tag} label={tag} onDelete={() => onChange(value.filter((t) => t !== tag))} size="small" />
          ))}
        </Stack>
      )}
      <TextField
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={commit}
        placeholder={placeholder}
        size="small"
        fullWidth
        error={!!error}
        helperText={error ?? helperText ?? `Press Enter to add. Max ${max}.`}
      />
    </Box>
  );
}
