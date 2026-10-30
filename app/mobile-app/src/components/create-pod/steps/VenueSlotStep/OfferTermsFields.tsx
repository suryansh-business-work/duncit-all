import { useController } from 'react-hook-form';
import { YStack } from 'tamagui';
import { toDigits } from '@duncit/regex';
import {
  HOST_OFFER_MODELS,
  VENUE_OFFER_MODELS,
  VENUE_OFFER_MODEL_KEY,
  isFreeVenueOfferModel,
  isVenueOfferModel,
  venueOfferHelpKey,
  venueOfferModelKey,
} from '@duncit/utils';

import { LabeledInput } from '@/components/LabeledInput';
import { useTranslation } from '@/hooks/useTranslation';
import { ChipSelectField } from '../../ChipSelectField';
import type { CreatePodForm } from '../../create-pod.types';

export interface OfferTermsInputsProps {
  model: string;
  rate: string;
  onModel: (model: string) => void;
  onRate: (rate: string) => void;
  modelError?: string;
  rateError?: string;
  /**
   * Offer "Free venue" after the pricing options — only a host's opening offer
   * may (Create Pod, the resubmit sheet); a counter is always priced.
   */
  allowFree?: boolean;
}

/**
 * How the host offers to pay the venue — per guest, per hour or a flat price
 * for the window (or, on an opening offer, a free venue), with a line on how
 * the picked option pays (per guest is a minimum order value per person) — and
 * the amount, which a free venue does not ask for. The venue accepts it,
 * rejects it or counters with its own terms (a free one is only accepted or
 * declined). Presentational: Create Pod and the resubmit sheet each bind it to
 * their own form. mWeb twin: OfferTermsFields.
 */
export function OfferTermsInputs({
  model,
  rate,
  onModel,
  onRate,
  modelError,
  rateError,
  allowFree = false,
}: Readonly<OfferTermsInputsProps>) {
  const { t } = useTranslation();
  const picked = isVenueOfferModel(model) ? VENUE_OFFER_MODEL_KEY[model] : null;
  const rateLabel = picked ? t(picked.rate) : t('mweb.createPod.offer.rateLabel');
  // Once an option is picked, the line under it says how that option pays the venue.
  const helpKey = venueOfferHelpKey(model);
  const modelHelp = helpKey ? t(helpKey) : t('mweb.createPod.offer.modelHint');
  const options = (allowFree ? HOST_OFFER_MODELS : VENUE_OFFER_MODELS).map((option) => ({
    value: option,
    label: t(venueOfferModelKey(option)),
  }));

  return (
    <YStack gap={12} testID="create-pod-offer-terms">
      <ChipSelectField
        testID="create-pod-offer-model"
        label={t('mweb.createPod.offer.modelLabel')}
        hint={modelHelp}
        options={options}
        value={model}
        onChange={onModel}
        error={modelError}
        required
      />
      {isFreeVenueOfferModel(model) ? null : (
        <LabeledInput
          testID="venue_offer_rate"
          label={rateLabel}
          value={rate}
          onChangeText={(text) => onRate(toDigits(text))}
          keyboardType="numeric"
          hint={t('mweb.createPod.offer.rateHint')}
          error={rateError}
          required
        />
      )}
    </YStack>
  );
}

/** The offer terms on Create Pod's form — free venue included. */
export function OfferTermsFields({ form }: Readonly<{ form: CreatePodForm }>) {
  const model = useController({ control: form.control, name: 'venue_offer_model' });
  const rate = useController({ control: form.control, name: 'venue_offer_rate' });
  return (
    <OfferTermsInputs
      model={model.field.value}
      rate={rate.field.value}
      onModel={model.field.onChange}
      onRate={rate.field.onChange}
      modelError={model.fieldState.error?.message}
      rateError={rate.fieldState.error?.message}
      allowFree
    />
  );
}
