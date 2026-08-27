import { Alert, Chip, Stack, TextField, ThemeProvider, Tooltip } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { createDuncitTheme } from '@duncit/theme';

/** The Finance portal's brand accent — the ONLY thing a portal passes in. */
const financeAccent = { light: '#86efac', main: '#22c55e', hover: '#16a34a', active: '#15803d' };

/**
 * The same MUI controls under the shared theme. `ThemeProvider` rather than
 * `DuncitThemeProvider` because the latter also mounts `CssBaseline`, which
 * would restyle this whole docs page — a portal DOES want that, a preview
 * island does not.
 */
export function ThemedControls() {
  return (
    <ThemeProvider theme={createDuncitTheme('light', financeAccent)}>
      <Stack sx={{ gap: 2, maxWidth: 460 }}>
        <Stack direction="row" sx={{ gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
          <DuncitButton variant="contained">Approve payout</DuncitButton>
          <DuncitButton variant="outlined">Preview</DuncitButton>
          <Tooltip title="Settlement DUN-STL-2291">
            <Chip label="₹13,211.18" />
          </Tooltip>
          <Chip label="SETTLED" color="success" size="small" />
        </Stack>
        <TextField label="Host UPI ID" defaultValue="ananya.iyer@okhdfcbank" size="small" />
        <TextField label="IFSC" defaultValue="hdfc0001234" error helperText="Enter a valid IFSC code" size="small" />
        <Alert severity="info">Your spot is free — the calculation is based on total spots − 1.</Alert>
      </Stack>
    </ThemeProvider>
  );
}
