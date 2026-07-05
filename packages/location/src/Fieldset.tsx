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
        mt: 1,
        px: 2,
        pt: 1,
        pb: 2,
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 2,
        minWidth: 0,
        bgcolor: 'action.hover',
      }}
    >
      <Typography
        component="legend"
        variant="overline"
        sx={{ px: 1, fontWeight: 900, letterSpacing: 0.6, color: 'text.secondary', lineHeight: 1 }}
      >
        {legend}
      </Typography>
      {hint ? (
        <FormHelperText sx={{ mt: 0, mb: 1.5, mx: 0 }}>{hint}</FormHelperText>
      ) : null}
      <Stack spacing={2}>{children}</Stack>
    </Box>
  );
}
