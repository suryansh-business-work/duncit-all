import { useMemo } from 'react';
import { useController, useForm } from 'react-hook-form';
import { Text, XStack, YStack } from 'tamagui';
import { toDigits } from '@duncit/regex';

import { DuncitButton } from '@/components/DuncitButton';
import { DuncitDialog } from '@/components/DuncitDialog';
import { LabeledInput } from '@/components/LabeledInput';
import { OfferTermsInputs } from '@/components/create-pod/steps/VenueSlotStep/OfferTermsFields';
import { VenueQuoteCard } from '@/components/create-pod/steps/VenueSlotStep/VenueQuoteCard';
import { OfferWindowPicker } from '@/components/host-manage/ResubmitPickers';
import { usePublicFinance } from '@/hooks/usePublicFinance';
import { useQuoteRequest, type OfferQuoteAnswer } from '@/hooks/useQuoteRequest';
import { useTranslation } from '@/hooks/useTranslation';
import { formResolver } from '@/utils/form-resolver';
import {
  makeWindowOfferSchema,
  windowOfferDefaults,
  windowOfferOf,
  type WindowOffer,
  type WindowOfferValues,
} from './window-offer.types';

export interface WindowOfferFormProps {
  testID: string;
  /** The venue whose calendar the window is picked on. */
  venueId: string;
  title: string;
  subtitle: string;
  submitLabel: string;
  /** Ask for the guests (a Pod Request); omitted, the flow takes them from the pod. */
  askGuests?: boolean;
  busy: boolean;
  /** The last write's failure, as the server put it. */
  error?: string;
  /** This flow's own price query for a complete offer. */
  priceOf: (offer: WindowOffer) => Promise<OfferQuoteAnswer>;
  onClose: () => void;
  onSubmit: (offer: WindowOffer) => void;
}

const DIRTY = { shouldDirty: true, shouldValidate: true } as const;

/**
 * A time window and price terms for a venue, priced by the server as they are
 * picked: the window on the venue's own calendar (open days and hours, free
 * times only), the pricing option and amount, the guests where the flow needs
 * them, and the price with the venue's charges and Duncit's commission on top.
 * One sheet for a Pod Request's proposal, an Auto Pod's venue accept and a
 * venue taking over a pod.
 */
export function WindowOfferForm({
  testID,
  venueId,
  title,
  subtitle,
  submitLabel,
  askGuests = false,
  busy,
  error,
  priceOf,
  onClose,
  onSubmit,
}: Readonly<WindowOfferFormProps>) {
  const { t } = useTranslation();
  const { currency } = usePublicFinance();
  const schema = useMemo(() => makeWindowOfferSchema(t, askGuests), [t, askGuests]);
  const { control, handleSubmit, setValue, watch } = useForm<WindowOfferValues>({
    resolver: formResolver<WindowOfferValues>(schema),
    defaultValues: windowOfferDefaults(),
  });
  const start = useController({ control, name: 'start' });
  const end = useController({ control, name: 'end' });
  const model = useController({ control, name: 'model' });
  const rate = useController({ control, name: 'rate' });
  const guests = useController({ control, name: 'guests' });
  const offer = windowOfferOf(watch());
  const priced = !askGuests || (offer?.pax ?? 0) > 0;
  const quote = useQuoteRequest(
    offer && priced ? JSON.stringify(offer) : null,
    () => (offer ? priceOf(offer) : Promise.reject(new Error('No offer to price'))),
    `windowOffer:${testID}`,
  );
  const submit = handleSubmit((values) => {
    const next = windowOfferOf(values);
    if (next) onSubmit(next);
  });

  const footer = (
    <XStack gap={10}>
      <YStack flex={1}>
        <DuncitButton
          testID={`${testID}-cancel`}
          label={t('windowOffer.cancel')}
          onPress={onClose}
          variant="ghost"
          tone="neutral"
          fullWidth
        />
      </YStack>
      <YStack flex={1}>
        <DuncitButton
          testID={`${testID}-submit`}
          label={submitLabel}
          onPress={() => {
            submit().catch(() => undefined);
          }}
          loading={busy}
          disabled={busy || !quote.quote}
          fullWidth
        />
      </YStack>
    </XStack>
  );

  return (
    <DuncitDialog
      open
      onClose={onClose}
      testID={testID}
      title={title}
      subtitle={subtitle}
      closeLabel={t('mweb.common.close')}
      footer={footer}
    >
      <YStack gap={14}>
        <OfferWindowPicker
          venueId={venueId}
          start={start.field.value}
          end={end.field.value}
          error={start.fieldState.error?.message}
          onWindow={(nextStart, nextEnd) => {
            setValue('start', nextStart, DIRTY);
            setValue('end', nextEnd, DIRTY);
          }}
        />
        {askGuests ? (
          <LabeledInput
            testID={`${testID}-guests`}
            label={t('windowOffer.guests')}
            hint={t('windowOffer.guestsHint')}
            value={guests.field.value}
            onChangeText={(text) => guests.field.onChange(toDigits(text))}
            keyboardType="number-pad"
            error={guests.fieldState.error?.message}
            required
          />
        ) : null}
        <OfferTermsInputs
          model={model.field.value}
          rate={rate.field.value}
          onModel={model.field.onChange}
          onRate={rate.field.onChange}
          modelError={model.fieldState.error?.message}
          rateError={rate.fieldState.error?.message}
        />
        <VenueQuoteCard {...quote} currencySymbol={currency} />
        {error ? (
          <Text role="alert" testID={`${testID}-error`} fontSize={13} color="$danger">
            {error}
          </Text>
        ) : null}
      </YStack>
    </DuncitDialog>
  );
}
