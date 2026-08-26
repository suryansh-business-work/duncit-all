import { Stack, Typography } from '@mui/material';
import { SpotsStepper } from '@duncit/ui';
import { spotsBoundsHint } from './pod-edit.form';
import type { HostPodActionLabels } from './labels';
import type { PodSpotLimits } from './types';

interface Props {
  limits: PodSpotLimits;
  labels: HostPodActionLabels;
  value: number;
  onChange: (next: number) => void;
  error?: string;
}

/**
 * The pod's capacity, inside the edit dialog.
 *
 * A pod published smaller than the space it booked used to be stuck that way
 * for good: the only spot control lived in Create-a-Pod. The range comes from
 * the server (`podSpotLimits`) because the booked slot is no longer in any
 * list the client can read, and the control is the SAME stepper Create-a-Pod
 * renders — one slider, two flows (rule 40).
 *
 * Hoisted to module scope rather than nested in the dialog (S6478).
 */
export default function PodSpotsField({ limits, labels, value, onChange, error }: Readonly<Props>) {
  return (
    <Stack spacing={0.5}>
      <SpotsStepper
        labels={labels.spots}
        value={value}
        onChange={onChange}
        min={limits.min}
        max={limits.max}
        slidable={limits.slidable}
        boundsHint={spotsBoundsHint(limits, labels)}
        error={error}
      />
      {!limits.can_decrease && (
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {labels.spotsIncreaseOnly}
        </Typography>
      )}
    </Stack>
  );
}
