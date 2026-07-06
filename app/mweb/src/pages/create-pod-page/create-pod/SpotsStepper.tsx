import { Box, FormHelperText, IconButton, Stack, TextField, Typography } from '@mui/material';
import RemoveIcon from '@mui/icons-material/Remove';
import AddIcon from '@mui/icons-material/Add';

interface Props {
  value: number;
  onChange: (next: number) => void;
  error?: string;
  min?: number;
  max?: number;
  /** When true, spots are fixed by the venue space's capacity — shown read-only. */
  readOnly?: boolean;
}

/** Total-spots control. For physical pods it is read-only — the count comes from
 * the venue space's capacity. Virtual pods use the editable stepper (0–10000). */
export default function SpotsStepper({ value, onChange, error, min = 0, max = 10000, readOnly = false }: Readonly<Props>) {
  const set = (next: number) => onChange(Math.max(min, Math.min(max, Number.isFinite(next) ? next : min)));

  return (
    <Box>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        spacing={1}
        sx={{ p: 1.5, border: 1, borderColor: error ? 'error.main' : 'divider', borderRadius: 2.5 }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle2" fontWeight={900}>Total spots</Typography>
          <Typography variant="caption" color="text.secondary">
            {readOnly ? 'Set by the venue space you picked.' : 'Number of available tickets.'}
          </Typography>
        </Box>
        {readOnly ? (
          <Typography variant="h6" fontWeight={900} sx={{ px: 1.5 }} aria-label="Total spots">
            {value}
          </Typography>
        ) : (
          <Stack direction="row" alignItems="center" spacing={1}>
            <IconButton aria-label="Decrease spots" size="small" disabled={value <= min} onClick={() => set(value - 1)} sx={{ border: 1, borderColor: 'divider' }}>
              <RemoveIcon fontSize="small" />
            </IconButton>
            <TextField
              type="number"
              size="small"
              value={value}
              onChange={(e) => set(Number.parseInt(e.target.value, 10))}
              sx={{ width: 76, '& input': { textAlign: 'center', fontWeight: 900 } }}
              inputProps={{ 'aria-label': 'Total spots', min, max }}
            />
            <IconButton aria-label="Increase spots" size="small" disabled={value >= max} onClick={() => set(value + 1)} sx={{ border: 1, borderColor: 'divider' }}>
              <AddIcon fontSize="small" />
            </IconButton>
          </Stack>
        )}
      </Stack>
      {error && <FormHelperText error>{error}</FormHelperText>}
    </Box>
  );
}
