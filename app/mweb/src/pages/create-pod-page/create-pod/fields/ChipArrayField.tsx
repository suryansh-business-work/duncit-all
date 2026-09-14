import { useState, type KeyboardEvent } from 'react';
import { Box, Chip, Stack, TextField, Typography } from '@mui/material';
import { requiredLabel } from '../../../../forms/components/requiredLabel';
import { useTranslation } from '../../../../i18n/useTranslation';

interface Props {
  label: string;
  required?: boolean;
  value: string[];
  onChange: (next: string[]) => void;
  helperText?: string;
  placeholder?: string;
  max?: number;
  error?: string;
  testId?: string;
}

/** Enter-to-add chip list backed by a string[] form field. */
export default function ChipArrayField({
  label,
  required,
  value,
  onChange,
  helperText,
  placeholder,
  max = 20,
  error,
  testId = 'chip-array-field',
}: Readonly<Props>) {
  const [draft, setDraft] = useState('');
  const { t } = useTranslation();

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
    <Box data-testid={testId}>
      <Typography variant="subtitle2" sx={{ mb: 0.75 }}>
        {requiredLabel(label, required)}
      </Typography>
      {value.length > 0 && (
        <Stack direction="row" sx={{ flexWrap: 'wrap', gap: 0.75, mb: 1 }}>
          {value.map((tag) => (
            <Chip
              key={tag}
              data-testid={`${testId}-chip-${tag}`}
              label={tag}
              color="primary"
              onDelete={() => onChange(value.filter((t) => t !== tag))}
              size="small"
            />
          ))}
        </Stack>
      )}
      <TextField
        data-testid={`${testId}-input`}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={onKeyDown}
        onBlur={commit}
        placeholder={placeholder ?? t('mweb.createPod.chipPlaceholder')}
        size="small"
        fullWidth
        error={!!error}
        helperText={error ?? helperText ?? t('mweb.createPod.chipMaxHint', { vars: { max } })}
        slotProps={{ htmlInput: { 'data-testid': `${testId}-input-field` } }}
      />
    </Box>
  );
}
