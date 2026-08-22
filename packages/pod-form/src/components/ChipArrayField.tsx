import { useState, type KeyboardEvent } from 'react';
import { Box, Chip, Stack, TextField, Typography } from '@mui/material';

interface Props {
  label: string;
  value: string[];
  onChange: (next: string[]) => void;
  helperText?: string;
  placeholder?: string;
  max?: number;
  error?: string;
}

/** Free-text chip editor backing a `string[]` field (Enter/comma to add). */
export default function ChipArrayField({
  label,
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
    if (!next) return;
    if (value.includes(next)) {
      setDraft('');
      return;
    }
    if (value.length >= max) return;
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

  const remove = (idx: number) => {
    onChange(value.filter((_, i) => i !== idx));
  };

  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 0.75 }}>
        {label}
      </Typography>
      {value.length > 0 && (
        <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5, mb: 1 }}>
          {value.map((tag, i) => (
            <Chip key={`${tag}-${i}`} label={tag} onDelete={() => remove(i)} size="small" />
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
        helperText={error || helperText || `Press Enter to add. Max ${max}.`}
      />
    </Box>
  );
}
