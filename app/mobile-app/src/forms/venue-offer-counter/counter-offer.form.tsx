import { useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Spinner, Text, XStack, YStack } from 'tamagui';
import {
  makeVenueOfferCounterSchema,
  VENUE_OFFER_COUNTER_MODELS,
  venueOfferCounterDefaults,
  type VenueOfferCounterValues,
} from '@duncit/forms/schemas';
import { VENUE_OFFER_INBOX_MODEL_KEY } from '@duncit/utils';

import { DuncitButton } from '@/components/DuncitButton';
import { DuncitDialog } from '@/components/DuncitDialog';
import { FormTextField } from '@/components/FormTextField';
import { SelectChip } from '@/components/venue-availability/SelectChip';
import { BreakdownLines } from '@/components/venue-pricing/BreakdownLines';
import { useTranslation } from '@/hooks/useTranslation';
import { useVenueCounterQuote } from '@/hooks/useVenueCounterQuote';
import type { CounterTerms } from '@/hooks/useVenueSlotRequests';
import { formResolver } from '@/utils/form-resolver';

interface Props {
  slotId: string;
  /** The terms on the table — the counter starts as an edit of them. */
  terms: { model: string; rate: number } | null;
  busy: boolean;
  onClose: () => void;
  onSend: (terms: CounterTerms, note: string) => void;
}

const termsOf = (values: Pick<VenueOfferCounterValues, 'model' | 'rate'>): CounterTerms | null => {
  const rate = Number(String(values.rate).trim());
  return Number.isFinite(rate) && rate > 0 ? { model: values.model, rate } : null;
};

/**
 * The venue's counter to a host's offer: a pricing option, the amount and a
 * note, with the server's price of those terms for the booking's own window
 * as they are typed. One rule with the web (`makeVenueOfferCounterSchema`).
 */
export function VenueOfferCounterForm({ slotId, terms, busy, onClose, onSend }: Readonly<Props>) {
  const { t } = useTranslation();
  const schema = useMemo(() => makeVenueOfferCounterSchema(t), [t]);
  const { control, handleSubmit, watch } = useForm<
    VenueOfferCounterValues,
    any,
    VenueOfferCounterValues
  >({
    resolver: formResolver<VenueOfferCounterValues>(schema),
    defaultValues: venueOfferCounterDefaults(terms),
  });
  const model = watch('model');
  const rate = watch('rate');
  const quote = useVenueCounterQuote(
    slotId,
    termsOf({ model, rate }),
    t('availability.offers.quoteFailed'),
  );
  const send = handleSubmit((valid) => {
    const next = termsOf(valid);
    if (next) onSend(next, valid.note);
  });

  const footer = (
    <XStack gap={10}>
      <YStack flex={1}>
        <DuncitButton
          testID="venue-offer-counter-cancel"
          label={t('availability.offers.cancel')}
          onPress={onClose}
          variant="ghost"
          tone="neutral"
          fullWidth
        />
      </YStack>
      <YStack flex={1}>
        <DuncitButton
          testID="venue-offer-counter-send"
          label={t('availability.offers.send')}
          onPress={() => {
            send().catch(() => undefined);
          }}
          loading={busy}
          disabled={busy}
          fullWidth
        />
      </YStack>
    </XStack>
  );

  return (
    <DuncitDialog
      open
      onClose={onClose}
      testID="venue-offer-counter"
      title={t('availability.offers.counterTitle')}
      subtitle={t('availability.offers.counterHint')}
      closeLabel={t('mweb.common.close')}
      footer={footer}
    >
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
                  onPress={() => field.onChange(option)}
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
        <FormTextField
          control={control}
          name="note"
          label={t('availability.offers.note')}
          multiline
          numberOfLines={3}
        />
        <YStack gap={8} testID="venue-offer-counter-quote">
          <Text role="heading" fontSize={15} fontWeight="600" color="$color">
            {t('availability.offers.preview')}
          </Text>
          {quote.isLoading ? (
            <XStack gap={8} alignItems="center">
              <Spinner color="$primary" />
              <Text fontSize={13} color="$muted">
                {t('availability.offers.quoteLoading')}
              </Text>
            </XStack>
          ) : null}
          {quote.error ? (
            <Text role="alert" fontSize={13} color="$danger">
              {quote.error}
            </Text>
          ) : null}
          {quote.result && !quote.result.ok ? (
            <Text role="alert" fontSize={13} color="$warning">
              {quote.result.message}
            </Text>
          ) : null}
          {quote.result?.quote ? (
            <BreakdownLines breakdown={quote.result.quote} testID="venue-offer-counter-lines" />
          ) : null}
        </YStack>
      </YStack>
    </DuncitDialog>
  );
}
