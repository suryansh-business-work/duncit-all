import { Controller, useWatch, type Control } from 'react-hook-form';
import { MenuItem, Stack, TextField } from '@mui/material';
import { HOST_OFFER_MODELS, isFreeVenueOfferModel, type HostOfferModel } from '@duncit/utils';
import { useHostPodActionsConfig } from '../HostPodActionsProvider';
import type { PodResubmitValues } from './pod-resubmit.form';

/** Each option's label on the surface's own copy. */
type ModelLabelKey = 'offerModelPerGuest' | 'offerModelPerHour' | 'offerModelFlat' | 'offerModelFree';
const MODEL_LABEL: Readonly<Record<HostOfferModel, ModelLabelKey>> = {
  PER_GUEST: 'offerModelPerGuest',
  PER_HOUR: 'offerModelPerHour',
  FLAT: 'offerModelFlat',
  FREE: 'offerModelFree',
};

/**
 * How the host offers to pay the new venue — per guest, per hour, a flat
 * price, or asking for it free — and the amount (none for a free venue). The
 * venue accepts, rejects or counters a priced offer; a free one it accepts or
 * declines.
 */
export default function OfferTermsFields({ control }: Readonly<{ control: Control<PodResubmitValues> }>) {
  const { labels } = useHostPodActionsConfig();
  const model = useWatch({ control, name: 'venue_offer_model' });
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
            {HOST_OFFER_MODELS.map((option) => (
              <MenuItem key={option} value={option}>
                {labels[MODEL_LABEL[option]]}
              </MenuItem>
            ))}
          </TextField>
        )}
      />
      {/* A free venue is paid nothing, so there is no amount to ask for. */}
      {!isFreeVenueOfferModel(model) && (
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
      )}
    </Stack>
  );
}
