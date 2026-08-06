import { Box, Stack, TextField, Typography } from '@mui/material';

export interface TestVariable {
  key: string;
  /** True when the MJML uses it but the template has not declared it. */
  detectedOnly?: boolean;
}

interface Props {
  variables: TestVariable[];
  values: Record<string, string>;
  onChange: (key: string, value: string) => void;
  disabled?: boolean;
}

/**
 * One field per placeholder the template actually uses.
 *
 * A test send used to take whatever JSON happened to be in the Variables tab,
 * which meant the person sending the test had to leave the dialog, find the
 * tab, edit raw JSON and come back — and an unfilled placeholder renders as a
 * GAP in the message rather than an error, so it was easy to send a test that
 * quietly proved nothing.
 *
 * `{{t:…}}` keys are left out: those are localization, supplied by the send
 * itself, and asking an admin to type them would be asking them to translate.
 */
export default function TestVariableFields({
  variables,
  values,
  onChange,
  disabled = false,
}: Readonly<Props>) {
  if (variables.length === 0) {
    return (
      <Typography variant="caption" color="text.secondary">
        This template has no variables — nothing to fill in.
      </Typography>
    );
  }

  return (
    <Box>
      <Typography variant="caption" color="text.secondary">
        Values for this test. Blank renders as an empty space, exactly as a real send would.
      </Typography>
      <Stack spacing={1.25} sx={{ mt: 1 }}>
        {variables.map((v) => (
          <TextField
            key={v.key}
            size="small"
            fullWidth
            label={v.key}
            value={values[v.key] ?? ''}
            onChange={(e) => onChange(v.key, e.target.value)}
            disabled={disabled}
            helperText={v.detectedOnly ? 'Used in the MJML but not declared' : undefined}
          />
        ))}
      </Stack>
    </Box>
  );
}
