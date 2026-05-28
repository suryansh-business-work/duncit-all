import { Box, InputAdornment, Slider, Stack, TextField, Tooltip, Typography } from '@mui/material';

interface Props {
  label: string;
  value: number;
  onChange: (next: number) => void;
  hint?: string;
  max?: number;
  step?: number;
}

const clampPct = (value: number, max: number) => Math.min(Math.max(value, 0), max);

/** Percentage slider + synced number input. Identical UX across the form. */
export default function PercentSlider({ label, value, onChange, hint, max = 100, step = 1 }: Props) {
  const marks = max === 100
    ? [
        { value: 0, label: '0' },
        { value: 25, label: '25' },
        { value: 50, label: '50' },
        { value: 75, label: '75' },
        { value: 100, label: '100' },
      ]
    : undefined;
  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 0.5 }}>
        <Tooltip title={hint ?? ''} placement="top" arrow disableHoverListener={!hint}>
          <Typography variant="body2" fontWeight={700} sx={{ flex: 1, minWidth: 0 }} noWrap>
            {label}
          </Typography>
        </Tooltip>
        <TextField
          size="small"
          type="number"
          value={Number.isFinite(value) ? value : 0}
          onChange={(e) => onChange(clampPct(Number(e.target.value), max))}
          inputProps={{ min: 0, max, step }}
          InputProps={{ endAdornment: <InputAdornment position="end">%</InputAdornment> }}
          sx={{ width: 110 }}
        />
      </Stack>
      <Slider
        size="small"
        value={clampPct(value, max)}
        onChange={(_, next) => onChange(clampPct(next as number, max))}
        min={0}
        max={max}
        step={step}
        marks={marks}
        valueLabelDisplay="auto"
        valueLabelFormat={(v) => `${v}%`}
        sx={{ mt: 0.5 }}
      />
      {hint && (
        <Typography variant="caption" color="text.secondary">
          {hint}
        </Typography>
      )}
    </Box>
  );
}
