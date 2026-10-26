import { Controller, type Control, type UseFormSetValue } from 'react-hook-form';
import { XStack, YStack } from 'tamagui';
import { VENUE_OFFER_COUNTER_MODELS } from '@duncit/forms/schemas';
import { VENUE_OFFER_INBOX_MODEL_KEY } from '@duncit/utils';

import { FormTextField } from '@/components/FormTextField';
import { SelectChip } from '@/components/venue-availability/SelectChip';
import type { OfferSide } from '@/components/venue-offer/offer-format';
import { useTranslation } from '@/hooks/useTranslation';
import { CounterImagesField } from './CounterImagesField';
import { asksMinGuests, type CounterOfferValues } from './counter-offer.types';

interface Props {
  control: Control<CounterOfferValues>;
  setValue: UseFormSetValue<CounterOfferValues>;
  /** The option picked so far — a per-guest price also names the fewest guests. */
  model: string;
  /** Who counters: the note goes to the other side. */
  side: OfferSide;
  /** The booking's guests: the most a minimum may name. */
  maxGuests: number;
}

/**
 * A counter's terms: the pricing option, the amount, the fewest guests paid
 * for (a per-guest price only), what the venue provides (one point per line),
 * a note to the other side and up to four photos from the device. mWeb twin:
 * CounterOfferForm's fields.
 */
export function CounterOfferFields({ control, setValue, model, side, maxGuests }: Readonly<Props>) {
  const { t } = useTranslation();
  const noteLabel =
    side === 'HOST' ? t('availability.offers.hostAnswer.note') : t('availability.offers.note');

  return (
    <YStack gap={12}>
      <Controller
        control={control}
        name="model"
        render={({ field }) => (
          <XStack
            gap={8}
            flexWrap="wrap"
            role="radiogroup"
            aria-label={t('availability.offers.pricingOption')}
          >
            {VENUE_OFFER_COUNTER_MODELS.map((option) => (
              <SelectChip
                key={option}
                testID={`venue-offer-counter-model-${option}`}
                role="radio"
                label={t(VENUE_OFFER_INBOX_MODEL_KEY[option].label)}
                selected={field.value === option}
                onPress={() => {
                  field.onChange(option);
                  // A hidden minimum is never sent, so it never blocks the counter either.
                  if (!asksMinGuests(option)) setValue('min_guests', '');
                }}
              />
            ))}
          </XStack>
        )}
      />
      <FormTextField
        control={control}
        name="rate"
        label={t('availability.offers.amount')}
        keyboardType="decimal-pad"
      />
      {asksMinGuests(model) ? (
        <FormTextField
          control={control}
          name="min_guests"
          label={t('availability.offers.minGuests')}
          hint={t('availability.offers.minGuestsHint', { vars: { max: maxGuests } })}
          keyboardType="number-pad"
          digitsOnly
        />
      ) : null}
      <FormTextField
        control={control}
        name="offerings"
        label={t('availability.offers.offeringsLabel')}
        hint={t('availability.offers.offeringsHint')}
        multiline
        numberOfLines={4}
      />
      <FormTextField control={control} name="note" label={noteLabel} multiline numberOfLines={3} />
      <CounterImagesField control={control} />
    </YStack>
  );
}
