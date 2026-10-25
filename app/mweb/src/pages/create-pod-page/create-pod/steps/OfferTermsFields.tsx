import { Controller } from 'react-hook-form';
import { InputAdornment, MenuItem, Stack, TextField } from '@mui/material';
import { toDigits } from '@duncit/regex';
import { VENUE_OFFER_MODELS, VENUE_OFFER_MODEL_KEY, isVenueOfferModel } from '@duncit/utils';
import { requiredLabel } from '../../../../forms/components/requiredLabel';
import { usePricing } from '../../../../hooks/usePricing';
import { useTranslation } from '../../../../i18n/useTranslation';
import type { CreatePodForm } from '../create-pod.types';

interface Props {
  form: CreatePodForm;
}

/**
 * How the host offers to pay the venue — per guest, per hour, for the slot or
 * a flat price, with a line on how the picked option pays (per guest is a
 * minimum order value per person) — and the amount. The venue accepts it, rejects it or counters
 * with its own terms; the price card below shows the offer priced with the
 * venue's charges. Native twin: OfferTermsFields.
 */
export default function OfferTermsFields({ form }: Readonly<Props>) {
  const { t } = useTranslation();
  const { currency } = usePricing();
  const { control, formState } = form;
  const model = form.watch('venue_offer_model');
  const picked = isVenueOfferModel(model) ? VENUE_OFFER_MODEL_KEY[model] : null;
  const rateLabel = picked ? t(picked.rate) : t('mweb.createPod.offer.rateLabel');
  // Once an option is picked, the line under it says how that option pays the venue.
  const modelHelp = picked ? t(picked.help) : t('mweb.createPod.offer.modelHint');

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
            {VENUE_OFFER_MODELS.map((option) => (
              <MenuItem key={option} value={option} data-testid={`create-pod-offer-model-${option}`}>
                {t(VENUE_OFFER_MODEL_KEY[option].label)}
              </MenuItem>
            ))}
          </TextField>
        )}
      />
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
    </Stack>
  );
}
