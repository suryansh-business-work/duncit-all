import { Box, Paper, Typography } from '@mui/material';

/**
 * The labelled read-only pair every Telemetry detail dialog is built from.
 *
 * Bugs, Error Logs and the four level tables all show the same thing — a
 * caption over a value, and long text in a scrolling monospace block — and
 * three private copies of it is three chances for one dialog to start looking
 * unlike the others (rule 34).
 */

interface FieldProps {
  label: string;
  value: string;
  /** Inline monospace, for ids and fingerprints that must be read exactly. */
  mono?: boolean;
}

export function DetailField({ label, value, mono }: Readonly<FieldProps>) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography
        variant="body2"
        sx={{ wordBreak: 'break-word', ...(mono ? { fontFamily: 'monospace', fontSize: 12 } : {}) }}
      >
        {value || '—'}
      </Typography>
    </Box>
  );
}

/** A stack trace or a JSON blob: monospace, wrapped, and scrolling past 220px. */
export function DetailBlock({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Paper
        variant="outlined"
        sx={{ mt: 0.5, p: 1.5, maxHeight: 220, overflow: 'auto', bgcolor: 'action.hover' }}
      >
        <Typography
          component="pre"
          variant="caption"
          sx={{ m: 0, whiteSpace: 'pre-wrap', fontFamily: 'monospace' }}
        >
          {value}
        </Typography>
      </Paper>
    </Box>
  );
}
