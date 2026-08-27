import { Box, FormHelperText, Slider, Stack, TextField, Typography } from '@mui/material';
import RemoveIcon from '@mui/icons-material/Remove';
import AddIcon from '@mui/icons-material/Add';
import { DuncitIconButton } from '@duncit/buttons';
import type { SpotsStepperLabels } from './types';

export interface SpotsStepperProps {
  value: number;
  onChange: (next: number) => void;
  labels: SpotsStepperLabels;
  error?: string;
  min?: number;
  max?: number;
  /** True when there is a real range to pick from — render the slider. */
  slidable?: boolean;
  /** Shown under the slider: where the floor and the ceiling come from. */
  boundsHint?: string;
  /** When true, spots are fixed (no range to choose) — shown read-only. */
  readOnly?: boolean;
}

/**
 * Total-spots control — Create-a-Pod's, and the one a live pod is resized with.
 *
 * When the pod has a real range — the sub-category's minimum up to the booked
 * venue space's capacity — the host drags a slider anywhere between the two.
 * With no range to pick from (capacity equal to the minimum) it falls back to a
 * fixed read-only number, and a pod with no capped space keeps the plain
 * stepper, still floored by the minimum.
 *
 * Shared so Create-a-Pod and Edit Pod cannot drift into two different sliders
 * (rule 40). Native twin: `SpotsStepper` in the mobile app (rule 27).
 */
export function SpotsStepper({
  value,
  onChange,
  labels,
  error,
  min = 0,
  max = 10000,
  slidable = false,
  boundsHint,
  readOnly = false,
}: Readonly<SpotsStepperProps>) {
  const set = (next: number) =>
    onChange(Math.max(min, Math.min(max, Number.isFinite(next) ? next : min)));

  if (slidable) {
    return (
      <Box sx={{ p: 1.5, border: 1, borderColor: error ? 'error.main' : 'divider', borderRadius: '16px' }}>
        <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            {labels.totalSpots}
          </Typography>
          <Typography
            variant="h6"
            data-testid="spots-value"
            aria-label={labels.totalSpots}
            sx={{ fontWeight: 700 }}
          >
            {value}
          </Typography>
        </Stack>
        <Slider
          value={Math.max(min, Math.min(max, value))}
          min={min}
          max={max}
          step={1}
          marks={[
            { value: min, label: String(min) },
            { value: max, label: String(max) },
          ]}
          valueLabelDisplay="auto"
          onChange={(_e, next) => set(Array.isArray(next) ? next[0] : next)}
          aria-label={labels.totalSpots}
          data-testid="spots-slider"
        />
        {boundsHint && (
          <Typography variant="caption" data-testid="spots-bounds-hint" sx={{ color: 'text.secondary' }}>
            {boundsHint}
          </Typography>
        )}
        {error && <FormHelperText error>{error}</FormHelperText>}
      </Box>
    );
  }

  const stepperHint = readOnly ? labels.fixedHint : (boundsHint ?? labels.hint);

  return (
    <Box>
      <Stack
        direction="row"
        spacing={1}
        sx={{
          alignItems: 'center',
          justifyContent: 'space-between',
          p: 1.5,
          border: 1,
          borderColor: error ? 'error.main' : 'divider',
          borderRadius: '16px',
        }}
      >
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
            {labels.totalSpots}
          </Typography>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {stepperHint}
          </Typography>
        </Box>
        {readOnly ? (
          <Typography variant="h6" aria-label={labels.totalSpots} sx={{ fontWeight: 700, px: 1.5 }}>
            {value}
          </Typography>
        ) : (
          <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
            <DuncitIconButton
              aria-label={labels.decrease}
              size="small"
              disabled={value <= min}
              onClick={() => set(value - 1)}
              sx={{ border: 1, borderColor: 'divider' }}
            >
              <RemoveIcon fontSize="small" />
            </DuncitIconButton>
            <TextField
              type="number"
              size="small"
              value={value}
              onChange={(e) => set(Number.parseInt(e.target.value, 10))}
              sx={{ width: 76, '& input': { textAlign: 'center', fontWeight: 700 } }}
              slotProps={{ htmlInput: { 'aria-label': labels.totalSpots, min, max } }}
            />
            <DuncitIconButton
              aria-label={labels.increase}
              size="small"
              disabled={value >= max}
              onClick={() => set(value + 1)}
              sx={{ border: 1, borderColor: 'divider' }}
            >
              <AddIcon fontSize="small" />
            </DuncitIconButton>
          </Stack>
        )}
      </Stack>
      {error && <FormHelperText error>{error}</FormHelperText>}
    </Box>
  );
}
