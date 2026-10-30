import { Controller } from 'react-hook-form';
import { InputAdornment, MenuItem, Stack, TextField } from '@mui/material';
import { toDigits } from '@duncit/regex';
import {
  HOST_OFFER_MODELS,
  VENUE_OFFER_MODEL_KEY,
  isFreeVenueOfferModel,
  isVenueOfferModel,
  venueOfferHelpKey,
  venueOfferModelKey,
} from '@duncit/utils';
import { requiredLabel } from '../../../../forms/components/requiredLabel';
import { usePricing } from '../../../../hooks/usePricing';
import { useTranslation } from '../../../../i18n/useTranslation';
import type { CreatePodForm } from '../create-pod.types';

interface Props {
  form: CreatePodForm;
}

/**
 * How the host offers to pay the venue — per guest, per hour, a flat price, or
 * asking for the venue free — with a line on how the picked option pays (per
 * guest is a minimum order value per person), and the amount (none for a free
 * venue). The venue accepts, rejects or counters a priced offer and accepts or
 * declines a free one; the price card below shows the offer priced with the
 * venue's charges. Native twin: OfferTermsFields.
 */
export default function OfferTermsFields({ form }: Readonly<Props>) {
  const { t } = useTranslation();
  const { currency } = usePricing();
  const { control, formState } = form;
  const model = form.watch('venue_offer_model');
  const rateLabel = isVenueOfferModel(model) ? t(VENUE_OFFER_MODEL_KEY[model].rate) : t('mweb.createPod.offer.rateLabel');
  // Once an option is picked, the line under it says how that option pays the venue.
  const helpKey = venueOfferHelpKey(model);
  const modelHelp = helpKey ? t(helpKey) : t('mweb.createPod.offer.modelHint');

  return (
    <Stack spacing={1.5} data-testid="create-pod-offer-terms">
      <Controller
        control={control}
        name="venue_offer_model"
        render={({ field }) => (
          <TextField
            select
            fullWidth
            data-testid="create-pod-offer-model"
            label={requiredLabel(t('mweb.createPod.offer.modelLabel'), true)}
            value={field.value}
            onChange={(e) => field.onChange(e.target.value)}
            error={!!formState.errors.venue_offer_model}
            helperText={formState.errors.venue_offer_model?.message || modelHelp}
          >
            {HOST_OFFER_MODELS.map((option) => (
              <MenuItem key={option} value={option} data-testid={`create-pod-offer-model-${option}`}>
                {t(venueOfferModelKey(option))}
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
          render={({ field }) => (
            <TextField
              fullWidth
              data-testid="create-pod-offer-rate"
              label={requiredLabel(rateLabel, true)}
              value={field.value}
              onChange={(e) => field.onChange(toDigits(e.target.value))}
              slotProps={{
                htmlInput: { inputMode: 'numeric' },
                input: { startAdornment: <InputAdornment position="start">{currency}</InputAdornment> },
              }}
              error={!!formState.errors.venue_offer_rate}
              helperText={formState.errors.venue_offer_rate?.message || t('mweb.createPod.offer.rateHint')}
            />
          )}
        />
      )}
    </Stack>
  );
}
