import { Box, FormHelperText, IconButton, Slider, Stack, TextField, Typography } from '@mui/material';
import RemoveIcon from '@mui/icons-material/Remove';
import AddIcon from '@mui/icons-material/Add';
import { useTranslation } from '../../../i18n/useTranslation';

interface Props {
  value: number;
  onChange: (next: number) => void;
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
 * Total-spots control. When the pod has a real range — the sub-category's
 * minimum up to the booked venue space's capacity — the host drags a slider
 * anywhere between the two. With no range to pick from (capacity equal to the
 * minimum) it falls back to a fixed read-only number, and a virtual pod with no
 * venue keeps the plain stepper. Native twin (rule 27).
 */
export default function SpotsStepper({
  value,
  onChange,
  error,
  min = 0,
  max = 10000,
  slidable = false,
  boundsHint,
  readOnly = false,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const totalSpots = t('mweb.createPod.totalSpots');
  const set = (next: number) => onChange(Math.max(min, Math.min(max, Number.isFinite(next) ? next : min)));

  if (slidable) {
    return (
      <Box sx={{ p: 1.5, border: 1, borderColor: error ? 'error.main' : 'divider', borderRadius: '16px' }}>
        <Stack
          direction="row"
          spacing={1}
          sx={{
            alignItems: "center",
            justifyContent: "space-between"
          }}>
          <Typography variant="subtitle2" sx={{
            fontWeight: 700
          }}>
            {totalSpots}
          </Typography>
          <Typography variant="h6" data-testid="spots-value" aria-label={totalSpots} sx={{
            fontWeight: 700
          }}>
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
          aria-label={totalSpots}
          data-testid="spots-slider"
        />
        {boundsHint && (
          <Typography variant="caption" data-testid="spots-bounds-hint" sx={{
            color: "text.secondary"
          }}>
            {boundsHint}
          </Typography>
        )}
        {error && <FormHelperText error>{error}</FormHelperText>}
      </Box>
    );
  }

  return (
    <Box>
      <Stack
        direction="row"
        spacing={1}
        sx={{
          alignItems: "center",
          justifyContent: "space-between",
          p: 1.5,
          border: 1,
          borderColor: error ? 'error.main' : 'divider',
          borderRadius: '16px'
        }}>
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="subtitle2" sx={{
            fontWeight: 700
          }}>{totalSpots}</Typography>
          <Typography variant="caption" sx={{
            color: "text.secondary"
          }}>
            {readOnly ? t('mweb.createPod.spotsFixedHint') : t('mweb.createPod.spotsHint')}
          </Typography>
        </Box>
        {readOnly ? (
          <Typography
            variant="h6"
            aria-label={totalSpots}
            sx={{
              fontWeight: 700,
              px: 1.5
            }}>
            {value}
          </Typography>
        ) : (
          <Stack direction="row" spacing={1} sx={{
            alignItems: "center"
          }}>
            <IconButton aria-label={t('mweb.createPod.decreaseSpots')} size="small" disabled={value <= min} onClick={() => set(value - 1)} sx={{ border: 1, borderColor: 'divider' }}>
              <RemoveIcon fontSize="small" />
            </IconButton>
            <TextField
              type="number"
              size="small"
              value={value}
              onChange={(e) => set(Number.parseInt(e.target.value, 10))}
              sx={{ width: 76, '& input': { textAlign: 'center', fontWeight: 700 } }}
              slotProps={{
                htmlInput: { 'aria-label': totalSpots, min, max }
              }}
            />
            <IconButton aria-label={t('mweb.createPod.increaseSpots')} size="small" disabled={value >= max} onClick={() => set(value + 1)} sx={{ border: 1, borderColor: 'divider' }}>
              <AddIcon fontSize="small" />
            </IconButton>
          </Stack>
        )}
      </Stack>
      {error && <FormHelperText error>{error}</FormHelperText>}
    </Box>
  );
}
