import { useState } from 'react';
import { Text, YStack } from 'tamagui';
import { createPodSendsOffer, isFreeVenueOfferModel, type FreePodVenueNotice } from '@duncit/utils';

import { FormTextField } from '@/components/FormTextField';
import { SurfaceCard } from '@/components/SurfaceCard';
import { useTranslation } from '@/hooks/useTranslation';
import { FREE_JUSTIFICATION_NAMES, FreeArrangementFields } from '../free-arrangement';
import { PodTypeCards } from '../PodTypeCards';
import {
  FreePodNote,
  PricePanel,
  SuggestedPriceLink,
  SuggestedPricesModal,
  ZeroEarningsNotice,
  type PodPricingState,
} from '../price-panel';
import type { CreatePodFinance, CreatePodForm, CreatePodProduct } from '../create-pod.types';
import { MoneyMoreOptions } from './MoneyMoreOptions';

interface Props {
  form: CreatePodForm;
  products: CreatePodProduct[];
  showProducts: boolean;
  finance: CreatePodFinance;
  /** Money's shared state, owned by the stepper (it gates Create Pod). */
  pricing: PodPricingState;
  /** What a free pod's host is told about the picked slot's venue charges. */
  venueNotice: FreePodVenueNotice;
  /** A club admin is creating the pod for a host — the venue note speaks of the host. */
  forClubAdmin?: boolean;
}

/** Money's ticket — Free/Paid cards and the price (with its suggested-price
 * helper and zero-earnings guard), then the slot-cost / GST / earnings panel; a
 * FREE pod has no amount and no calculation and reads a short note instead,
 * with why it is free. That is asked once on Money: beside a free venue offer
 * when there is one, else here. The optional extras follow, folded. mWeb twin. */
export function PricingStep({
  form,
  products,
  showProducts,
  finance,
  pricing,
  venueNotice,
  forClubAdmin = false,
}: Readonly<Props>) {
  const { control, watch } = form;
  const { t } = useTranslation();
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const isFree = watch('pod_type') === 'FREE';
  // The offer section asks it already when it shows a free venue (VenueOfferStep).
  const askedWithOffer =
    createPodSendsOffer({
      pod_mode: watch('pod_mode'),
      partner_request_id: watch('partner_request_id'),
      venue_slot_id: watch('venue_slot_id'),
    }) && isFreeVenueOfferModel(watch('venue_offer_model'));

  return (
    <YStack testID="pricing-step" gap={16}>
      <SurfaceCard testID="pricing-step-price-card" gap={16}>
        <Text fontSize={14} fontWeight="700" color="$color">
          {t('mweb.createPod.ticketTitle')}
        </Text>
        <PodTypeCards form={form} />
        {isFree ? null : (
          <FormTextField
            control={control}
            name="pod_amount_text"
            label={t('mweb.createPod.ticketPriceLabel')}
            keyboardType="numeric"
            placeholder={t('mweb.createPod.ticketPricePlaceholder')}
            hint={t('mweb.createPod.ticketPriceHint')}
            labelAction={<SuggestedPriceLink onPress={() => setSuggestionsOpen(true)} />}
          />
        )}
        {!isFree && pricing.zeroEarnings ? <ZeroEarningsNotice /> : null}
        {isFree && !askedWithOffer ? (
          <FreeArrangementFields control={control} names={FREE_JUSTIFICATION_NAMES} testIDPrefix="create-pod-pod" />
        ) : null}
      </SurfaceCard>
      {isFree ? (
        <FreePodNote venueNotice={venueNotice} forClubAdmin={forClubAdmin} />
      ) : (
        <PricePanel finance={finance} pricing={pricing} />
      )}
      <MoneyMoreOptions form={form} products={products} showProducts={showProducts} currencySymbol={finance.currency_symbol} />
      {isFree ? null : (
        <SuggestedPricesModal
          open={suggestionsOpen}
          onClose={() => setSuggestionsOpen(false)}
          noOfSpots={pricing.noOfSpots}
          venueId={pricing.venuePicked ? pricing.venueId : null}
          venueAmount={pricing.venuePicked ? pricing.slotPrice : null}
          symbol={finance.currency_symbol}
        />
      )}
    </YStack>
  );
}
