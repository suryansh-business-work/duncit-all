import { useController } from 'react-hook-form';
import { YStack } from 'tamagui';
import { toDigits } from '@duncit/regex';
import { VENUE_OFFER_MODELS, VENUE_OFFER_MODEL_KEY, isVenueOfferModel } from '@duncit/utils';

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
}

/**
 * How the host offers to pay the venue — per guest, per hour, for the slot or
 * a flat price — and the amount. The venue accepts it, rejects it or counters
 * with its own terms. Presentational: Create Pod and the resubmit sheet each
 * bind it to their own form. mWeb twin: OfferTermsFields.
 */
export function OfferTermsInputs({
  model,
  rate,
  onModel,
  onRate,
  modelError,
  rateError,
}: Readonly<OfferTermsInputsProps>) {
  const { t } = useTranslation();
  const rateLabel = isVenueOfferModel(model)
    ? t(VENUE_OFFER_MODEL_KEY[model].rate)
    : t('mweb.createPod.offer.rateLabel');
  const options = VENUE_OFFER_MODELS.map((option) => ({
    value: option,
    label: t(VENUE_OFFER_MODEL_KEY[option].label),
  }));

  return (
    <YStack gap={12} testID="create-pod-offer-terms">
      <ChipSelectField
        testID="create-pod-offer-model"
        label={t('mweb.createPod.offer.modelLabel')}
        hint={t('mweb.createPod.offer.modelHint')}
        options={options}
        value={model}
        onChange={onModel}
        error={modelError}
        required
      />
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
    </YStack>
  );
}

/** The offer terms on Create Pod's form. */
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
    />
  );
}
