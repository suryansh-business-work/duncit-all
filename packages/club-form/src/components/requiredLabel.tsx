import { Box } from '@mui/material';
import type { ReactNode } from 'react';

/**
 * Appends a red required asterisk to a CUSTOM field label (a `Typography`/plain
 * text label that MUI's native `required` marker can't reach). Kept as a shared
 * helper so every custom club-form field renders the marker identically (DRY).
 */
export function requiredLabel(label: string, required?: boolean): ReactNode {
  return (
    <>
      {label}
      {required ? (
        <Box component="span" sx={{ color: 'error.main' }}>
          {' *'}
        </Box>
      ) : null}
    </>
  );
}
