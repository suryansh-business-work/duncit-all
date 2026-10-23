import { Controller } from 'react-hook-form';
import { Box, Stack, TextField } from '@mui/material';
import { PodProductsField } from '@duncit/pod-product-picker';
import { SpotsStepper, mwebSpotsLabels } from '@duncit/ui';
import PlaceChargesField from '../fields/PlaceChargesField';
import TicketDiscountStepField from '../fields/TicketDiscountStepField';
import PricePanel, { FreePodNote, TicketPriceField, type EarningsPreview } from '../price-panel';
import PodTypeCards from '../PodTypeCards';
import TermsAgreement from '../TermsAgreement';
import { useTranslation } from '../../../../i18n/useTranslation';
import { SURFACE_SX } from '../../../../theme';
import type { FreePodVenueNotice, SpotsBounds } from '@duncit/utils';
import type { CreatePodForm, CreatePodProduct } from '../create-pod.types';

interface Props {
  form: CreatePodForm;
  products: CreatePodProduct[];
  showProducts: boolean;
  preview: EarningsPreview;
  /** The range the host may size this pod within (sub-category min → venue capacity). */
  spots: SpotsBounds;
  /** What a free pod's host is told about the picked slot's venue charges. */
  venueNotice: FreePodVenueNotice;
}

/** Step 4 — Free/Paid cards, spots stepper, optional products and the Organizer
 * Terms publish gate. A PAID pod adds the ticket price, its multi-ticket
 * discount and the slot-cost / GST / earnings panel; a FREE pod has none of the
 * three — no amount and no calculation — and reads a short note instead. */
export default function PricingStep({ form, products, showProducts, preview, spots, venueNotice }: Readonly<Props>) {
  const { control, register, watch, setValue } = form;
  const { t } = useTranslation();
  const isFree = watch('pod_type') === 'FREE';
  const isPhysical = watch('pod_mode') === 'PHYSICAL';
  // An instant booking's spots are its guests, picked with the booking on the
  // venue step — shown here, not changed here, so the quote always matches.
  const setOnVenueStep = isPhysical && !watch('partner_request_id');
  const baseLabels = mwebSpotsLabels(t);
  const spotsLabels = setOnVenueStep ? { ...baseLabels, fixedHint: t('mweb.createPod.spotsSetOnVenueStep') } : baseLabels;
  const boundsHint = spots.slidable
    ? t('mweb.createPod.spotsBoundsHint', { vars: { min: spots.min, max: spots.max } })
    : undefined;

  return (
    <Stack data-testid="create-pod-pricing-step" spacing={2}>
      <Stack spacing={2} sx={{ ...SURFACE_SX, p: 2 }}>
        <PodTypeCards form={form} />
        {!isFree && <TicketPriceField form={form} preview={preview} />}
        <Controller
          control={control}
          name="no_of_spots"
          render={({ field, fieldState }) => (
            <SpotsStepper
              labels={spotsLabels}
              value={Number(field.value) || 0}
              onChange={field.onChange}
              error={fieldState.error?.message}
              min={spots.min}
              max={spots.max}
              slidable={spots.slidable && !setOnVenueStep}
              boundsHint={boundsHint}
              // Fixed when booked with the venue, or the venue leaves no room to choose.
              readOnly={setOnVenueStep || (isPhysical && !spots.slidable)}
            />
          )}
        />
      </Stack>
      {!isFree && <TicketDiscountStepField form={form} />}
      {isFree ? <FreePodNote venueNotice={venueNotice} /> : <PricePanel preview={preview} />}
      {/* Payment terms describe refunds and charges a free pod does not have. */}
      {!isFree && (
        <Box sx={{ ...SURFACE_SX, p: 2 }}>
          <TextField
            data-testid="payment_terms"
            label={t('mweb.createPod.paymentTerms')}
            fullWidth
            multiline
            minRows={3}
            helperText={t('mweb.createPod.paymentTermsHint')}
            {...register('payment_terms')}
            slotProps={{ htmlInput: { 'data-testid': 'payment_terms-input' } }}
          />
        </Box>
      )}
      {isPhysical && (
        <Box sx={{ ...SURFACE_SX, p: 2 }}>
          <Controller
            control={control}
            name="place_charges"
            render={({ field }) => (
              <PlaceChargesField
                value={field.value}
                onChange={field.onChange}
                helperText={t('mweb.createPod.placeChargesHint')}
              />
            )}
          />
        </Box>
      )}
      {showProducts && (
        // The "Attach products to this pod" switch is gone: attaching IS adding
        // a product, so `products_enabled` is derived from the row list on
        // submit rather than toggled here. `products` arrives already filtered
        // to the pod's club category, and the field says so when it is empty.
        <Box sx={{ ...SURFACE_SX, p: 2 }}>
          <Controller
            control={control}
            name="product_requests"
            render={({ field, fieldState }) => (
              <PodProductsField
                value={field.value}
                onChange={(next) => {
                  field.onChange(next);
                  setValue('products_enabled', next.length > 0);
                }}
                products={products}
                error={fieldState.error?.message}
              />
            )}
          />
        </Box>
      )}
      <TermsAgreement form={form} />
    </Stack>
  );
}
