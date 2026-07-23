import type { ReactNode } from 'react';
import { Box } from '@mui/material';

/**
 * Suffixes a form-field label with a red required asterisk (`Label *`) when
 * `required` is true, otherwise returns the label unchanged. Centralises the
 * required marker so every MUI field renders the asterisk after its label
 * identically (rule 34) — the marker sits on the label, never on the input.
 */
export function requiredLabel(label: ReactNode, required?: boolean): ReactNode {
  if (!required) return label;
  return (
    <>
      {label}{' '}
      <Box component="span" sx={{ color: 'error.main' }}>
        *
      </Box>
    </>
  );
}
