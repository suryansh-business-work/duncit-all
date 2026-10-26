import { Controller, type Control } from 'react-hook-form';
import { MenuItem, Stack, TextField } from '@mui/material';
import { VENUE_OFFER_MODELS, type VenueOfferModel } from '@duncit/utils';
import { useHostPodActionsConfig } from '../HostPodActionsProvider';
import type { PodResubmitValues } from './pod-resubmit.form';

/** Each pricing option's label on the surface's own copy. */
type ModelLabelKey = 'offerModelPerGuest' | 'offerModelPerHour' | 'offerModelFlat';
const MODEL_LABEL: Readonly<Record<VenueOfferModel, ModelLabelKey>> = {
  PER_GUEST: 'offerModelPerGuest',
  PER_HOUR: 'offerModelPerHour',
  FLAT: 'offerModelFlat',
};

/**
 * How the host offers to pay the new venue — per guest, per hour or a flat
 * price — and the amount. The venue accepts, rejects or counters it.
 */
export default function OfferTermsFields({ control }: Readonly<{ control: Control<PodResubmitValues> }>) {
  const { labels } = useHostPodActionsConfig();
  return (
    <Stack spacing={2}>
      <Controller
        control={control}
        name="venue_offer_model"
        render={({ field, fieldState }) => (
          <TextField
            select
            required
            fullWidth
            label={labels.offerModelLabel}
            data-testid="pod-resubmit-offer-model"
            value={field.value}
            onChange={(e) => field.onChange(e.target.value)}
            error={!!fieldState.error}
            helperText={fieldState.error?.message}
          >
            {VENUE_OFFER_MODELS.map((model) => (
              <MenuItem key={model} value={model}>
                {labels[MODEL_LABEL[model]]}
              </MenuItem>
            ))}
          </TextField>
        )}
      />
      <Controller
        control={control}
        name="venue_offer_rate"
        render={({ field, fieldState }) => (
          <TextField
            required
            fullWidth
            label={labels.offerRateLabel}
            value={field.value}
            onChange={(e) => field.onChange(e.target.value)}
            slotProps={{ htmlInput: { inputMode: 'numeric', 'data-testid': 'pod-resubmit-offer-rate' } }}
            error={!!fieldState.error}
            helperText={fieldState.error?.message}
          />
        )}
      />
    </Stack>
  );
}
