import { Stack, Typography } from '@mui/material';
import { FreeArrangementFields } from '@duncit/forms';
import PricePanel, { FreePodNote, TicketPriceField, type EarningsPreview } from '../price-panel';
import PodTypeCards from '../PodTypeCards';
import MoneyMoreOptions from './MoneyMoreOptions';
import { useTranslation } from '../../../../i18n/useTranslation';
import { SURFACE_SX } from '../../../../theme';
import type { FreePodVenueNotice } from '@duncit/utils';
import { FREE_JUSTIFICATION_NAMES, offersFreeVenue, type CreatePodForm, type CreatePodProduct } from '../create-pod.types';

interface Props {
  form: CreatePodForm;
  products: CreatePodProduct[];
  showProducts: boolean;
  preview: EarningsPreview;
  /** What a free pod's host is told about the picked slot's venue charges. */
  venueNotice: FreePodVenueNotice;
}

/** Money's ticket — Free/Paid cards and the price, then the slot-cost / GST /
 * earnings panel; a FREE pod has no amount and no calculation and reads a short
 * note instead, with why it is free. That is asked once on Money: beside a free
 * venue offer when there is one, else here. The optional extras follow, folded
 * (MoneyMoreOptions). */
export default function PricingStep({ form, products, showProducts, preview, venueNotice }: Readonly<Props>) {
  const { control, watch } = form;
  const { t } = useTranslation();
  const isFree = watch('pod_type') === 'FREE';
  const askedWithOffer = offersFreeVenue({
    pod_type: watch('pod_type'),
    pod_mode: watch('pod_mode'),
    venue_slot_id: watch('venue_slot_id'),
    partner_request_id: watch('partner_request_id'),
    venue_offer_model: watch('venue_offer_model'),
  });

  return (
    <Stack data-testid="create-pod-pricing-step" spacing={2}>
      <Stack spacing={2} sx={{ ...SURFACE_SX, p: 2 }}>
        <Typography variant="subtitle2" component="h3">{t('mweb.createPod.ticketTitle')}</Typography>
        <PodTypeCards form={form} />
        {isFree && !askedWithOffer && <FreeArrangementFields control={control} names={FREE_JUSTIFICATION_NAMES} t={t} idPrefix="create-pod-pricing" />}
        {!isFree && <TicketPriceField form={form} preview={preview} />}
      </Stack>
      {isFree ? <FreePodNote venueNotice={venueNotice} /> : <PricePanel preview={preview} />}
      <MoneyMoreOptions form={form} products={products} showProducts={showProducts} />
    </Stack>
  );
}
