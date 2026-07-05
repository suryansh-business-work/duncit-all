import type { ReactNode } from 'react';
import { Box, FormHelperText, Stack, Typography } from '@mui/material';

export interface FieldsetProps {
  /** Legend shown on the fieldset border. */
  legend: string;
  /** Helper hint under the legend — say WHY the fields matter (what maps from them). */
  hint?: string;
  children: ReactNode;
}

/**
 * A semantic <fieldset> with a legend + hint, so a group of related fields
 * (Location, Category …) reads as one distinct, self-explaining section in a
 * form. Shared by the location + category pickers.
 */
export function Fieldset({ legend, hint, children }: Readonly<FieldsetProps>) {
  return (
    <Box
      component="fieldset"
      sx={{
        m: 0,
        px: 2,
        pt: 1,
        pb: 2,
        border: 1,
        borderColor: 'divider',
        borderRadius: 2,
        minWidth: 0,
      }}
    >
      <Typography component="legend" variant="subtitle2" sx={{ px: 0.75, fontWeight: 800 }}>
        {legend}
      </Typography>
      {hint ? (
        <FormHelperText sx={{ mt: 0, mb: 1.25, mx: 0 }}>{hint}</FormHelperText>
      ) : null}
      <Stack spacing={2}>{children}</Stack>
    </Box>
  );
}
