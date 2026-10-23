import { useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Spinner, Text, XStack, YStack } from 'tamagui';
import { isVenueOfferModel } from '@duncit/utils';

import { DuncitButton } from '@/components/DuncitButton';
import { DuncitDialog } from '@/components/DuncitDialog';
import { FormTextField } from '@/components/FormTextField';
import { DateTimePickerField } from '@/components/venue-availability/DateTimePickerField';
import { BreakdownLines } from '@/components/venue-pricing/BreakdownLines';
import type { EventRequestOfferInput, VenueOfferModel } from '@/generated/graphql/graphql';
import { useTranslation } from '@/hooks/useTranslation';
import { useOfferQuote } from '@/hooks/useOfferQuote';
import { appNow } from '@/utils/app-formatter';
import { formResolver } from '@/utils/form-resolver';
import { FieldError } from '@/forms/venue-pricing/ControlledTimeField';
import {
  counterOfferDefaults,
  makeCounterOfferSchema,
  type CounterOfferValues,
} from './event-answer.types';
import { CounterTermsFields } from './counter-terms.fields';

interface Props {
  /** The venue the request is for — its pricing module prices the offer. */
  venueId: string;
  busy: boolean;
  onClose: () => void;
  onSend: (offer: EventRequestOfferInput, note: string) => void;
}

/** The offer the server prices and the mutation carries, or null until the window and an amount above 0 are set. */
const offerOf = (values: CounterOfferValues) =>
  values.start &&
  values.end &&
  values.end > values.start &&
  isVenueOfferModel(values.model) &&
  Number(values.rate) > 0
    ? {
        start_at: values.start.toISOString(),
        end_at: values.end.toISOString(),
        pax: Number(values.guests) || 0,
        model: values.model as VenueOfferModel,
        rate: Number(values.rate),
      }
    : null;

/**
 * Counter a request with the owner's own date, time, guests and price terms.
 * The server's quote (`venueOfferQuote`) for them shows as they are picked — the same price it freezes on
 * the offer when it is sent, so the member sees exactly this.
 */
export function CounterOfferForm({ venueId, busy, onClose, onSend }: Readonly<Props>) {
  const { t } = useTranslation();
  const schema = useMemo(() => makeCounterOfferSchema(t), [t]);
  const { control, handleSubmit, watch } = useForm<CounterOfferValues, any, CounterOfferValues>({
    resolver: formResolver<CounterOfferValues>(schema),
    defaultValues: counterOfferDefaults,
  });
  const values = watch();
  const offer = offerOf(values);
  const quote = useOfferQuote(venueId, offer);
  const send = handleSubmit((valid) => {
    const validOffer = offerOf(valid);
    if (validOffer) onSend(validOffer, valid.note);
  });

  const footer = (
    <XStack gap={10}>
      <YStack flex={1}>
        <DuncitButton
          testID="counter-offer-cancel"
          label={t('availability.eventInbox.cancel')}
          onPress={onClose}
          variant="ghost"
          tone="neutral"
          fullWidth
        />
      </YStack>
      <YStack flex={1}>
        <DuncitButton
          testID="counter-offer-send"
          label={t('availability.eventInbox.send')}
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
      testID="counter-offer"
      title={t('availability.eventInbox.counterTitle')}
      subtitle={t('availability.eventInbox.counterHint')}
      closeLabel={t('mweb.common.close')}
      footer={footer}
    >
      <YStack gap={12}>
        {(['start', 'end'] as const).map((name) => (
          <Controller
            key={name}
            control={control}
            name={name}
            render={({ field, fieldState }) => (
              <YStack gap={4}>
                <DateTimePickerField
                  testID={`counter-offer-${name}`}
                  label={
                    name === 'start'
                      ? t('availability.eventInbox.start')
                      : t('availability.eventInbox.end')
                  }
                  value={field.value}
                  onChange={field.onChange}
                  minDateTime={appNow()}
                  withTime
                />
                <FieldError
                  message={fieldState.error?.message}
                  testID={`counter-offer-${name}-error`}
                />
              </YStack>
            )}
          />
        ))}
        <FormTextField
          control={control}
          name="guests"
          label={t('availability.eventInbox.guests')}
          keyboardType="number-pad"
          digitsOnly
        />
        <CounterTermsFields control={control} />
        <FormTextField
          control={control}
          name="note"
          label={t('availability.eventInbox.noteLabel')}
          multiline
          numberOfLines={3}
        />
        {offer ? (
          <YStack gap={8} testID="counter-offer-quote">
            <Text role="heading" fontSize={15} fontWeight="600" color="$color">
              {t('availability.eventInbox.quoteTitle')}
            </Text>
            {quote.loading ? (
              <XStack gap={8} alignItems="center">
                <Spinner color="$primary" />
                <Text fontSize={13} color="$muted">
                  {t('availability.eventInbox.quoteLoading')}
                </Text>
              </XStack>
            ) : null}
            {quote.error || quote.message ? (
              <Text role="alert" fontSize={13} color="$danger">
                {quote.message ?? t('availability.eventInbox.quoteFailed')}
              </Text>
            ) : null}
            {quote.quote && !quote.error ? (
              <BreakdownLines breakdown={quote.quote} testID="counter-offer-lines" />
            ) : null}
          </YStack>
        ) : null}
      </YStack>
    </DuncitDialog>
  );
}
