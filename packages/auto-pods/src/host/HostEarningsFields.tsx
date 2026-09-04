import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import LinearProgress from '@mui/material/LinearProgress';
import Slider from '@mui/material/Slider';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import type { AutoPodLabels } from '@duncit/utils';
import { HostProjectionLines } from './HostProjectionLines';
import type { HostProjectionState } from './useHostProjection';

export interface HostEarningsFieldsProps {
  state: HostProjectionState;
  labels: AutoPodLabels;
  formatMoney: (amount: number) => string;
}

/**
 * Step 4 of Create a Pod, as a host meets it on an Auto Pod: the venue's
 * ceiling, the ticket price they type, the spots they drag to, and what the
 * server says that adds up to. It replaced a bare pair of number fields, which
 * asked a host to commit to a price without ever showing what it paid them.
 *
 * The same block backs both the read-only calculator and the assign dialog, so
 * the two can never disagree about what a price is worth.
 */
export function HostEarningsFields({
  state,
  labels,
  formatMoney,
}: Readonly<HostEarningsFieldsProps>) {
  const { projection, spots, setSpots } = state;
  // The venue's booked space fixes the ceiling; until the server answers there
  // is no honest range to draw, and a plain number field stands in.
  const min = projection?.min_spots ?? 0;
  const max = projection?.max_spots ?? 0;
  const slidable = max > min;

  return (
    <Stack spacing={1.5}>
      {projection ? (
        <Typography variant="body2" data-testid="auto-pod-total-spots" sx={{ fontWeight: 600 }}>
          {labels.earningsTotalSpots(projection.max_spots)}
        </Typography>
      ) : null}

      <TextField
        label={labels.earningsAddPrice}
        type="number"
        value={state.price}
        onChange={(event) => state.setPrice(event.target.value)}
        fullWidth
        error={state.priceInvalid}
        helperText={state.priceInvalid ? labels.earningsPricePositive : undefined}
        slotProps={{ htmlInput: { min: 1, max: 1999, step: 1 } }}
      />

      {slidable ? (
        <Box data-testid="auto-pod-spots-slider">
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {labels.spotsField}
          </Typography>
          <Slider
            value={Math.max(min, Math.min(max, spots))}
            min={min}
            max={max}
            step={1}
            marks={[
              { value: min, label: String(min) },
              { value: max, label: String(max) },
            ]}
            valueLabelDisplay="on"
            // Single-value slider, so `next` is always a number.
            onChange={(_event, next) => setSpots(next as number)}
            aria-label={labels.spotsField}
          />
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {labels.spotsRange(min, max)}
          </Typography>
        </Box>
      ) : (
        <TextField
          label={labels.spotsField}
          type="number"
          value={spots || ''}
          onChange={(event) => setSpots(Number(event.target.value) || 0)}
          fullWidth
          slotProps={{ htmlInput: { min: 2, step: 1 } }}
        />
      )}

      {state.loading ? <LinearProgress data-testid="auto-pod-projection-loading" /> : null}

      {projection ? (
        <HostProjectionLines projection={projection} labels={labels} formatMoney={formatMoney} />
      ) : (
        <Alert severity="info">{labels.earningsEnterPrice}</Alert>
      )}
    </Stack>
  );
}
