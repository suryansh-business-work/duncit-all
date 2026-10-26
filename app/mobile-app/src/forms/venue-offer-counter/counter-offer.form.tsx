import { useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { Text, XStack, YStack } from 'tamagui';
import {
  makeVenueOfferCounterSchema,
  venueOfferCounterDefaults,
  venueOfferEditDefaults,
  type VenueOfferCounterSource,
  type VenueOfferTerms,
} from '@duncit/forms/schemas';

import { DuncitButton } from '@/components/DuncitButton';
import { DuncitDialog } from '@/components/DuncitDialog';
import type { OfferSide } from '@/components/venue-offer/offer-format';
import type { CounterQuoteTarget } from '@/hooks/useCounterQuote';
import { useTranslation } from '@/hooks/useTranslation';
import { fireAndForget } from '@/utils/fire-and-forget';
import { formResolver } from '@/utils/form-resolver';
import { CounterOfferFields } from './CounterOfferFields';
import { CounterQuotePreview } from './CounterQuotePreview';
import { counterTermsOf, type CounterOfferValues } from './counter-offer.types';

interface Props {
  /** Who counters: the venue on its booking, or the host countering back on their pod. */
  side: OfferSide;
  /** Prices the terms as they are typed. */
  target: CounterQuoteTarget;
  /**
   * The terms on the table (`currentOfferTerms`) — the counter starts as an
   * edit of them. When `edit`, the reader's own counter, its note and photos too.
   */
  terms:
    (VenueOfferCounterSource & { note?: string | null; images?: readonly string[] | null }) | null;
  /** Changing the reader's own counter before the other side has seen it, rather than a new one. */
  edit?: boolean;
  /** The booking's guests: a minimum may not pass them. */
  maxGuests: number;
  busy: boolean;
  /** Why the server refused the counter; the sheet stays open to show it. */
  error: string | null;
  onClose: () => void;
  onSend: (terms: VenueOfferTerms, note: string) => void;
}

/** The sheet's words, as each side reads them, and for an edit of one's own counter. */
const COPY: Readonly<Record<OfferSide | 'EDIT', { title: string; hint: string; send: string }>> = {
  VENUE: {
    title: 'availability.offers.counterTitle',
    hint: 'availability.offers.counterHint',
    send: 'availability.offers.send',
  },
  HOST: {
    title: 'availability.offers.hostAnswer.counterTitle',
    hint: 'availability.offers.hostAnswer.counterHint',
    send: 'availability.offers.send',
  },
  EDIT: {
    title: 'availability.offers.revise.editTitle',
    hint: 'availability.offers.revise.editHint',
    send: 'availability.offers.revise.save',
  },
};

/**
 * Either side's counter to the terms on the table: a pricing option and the
 * amount, the fewest guests paid for (a per-guest price), what the venue
 * provides, a note and photos — with the server's price of those terms as they
 * are typed. The same sheet edits the reader's own unseen counter (`edit`),
 * starting from it whole. One rule with the web (`makeVenueOfferCounterSchema`).
 * mWeb twin: CounterOfferDialog + CounterOfferForm.
 */
export function VenueOfferCounterForm({
  side,
  target,
  terms,
  edit = false,
  maxGuests,
  busy,
  error,
  onClose,
  onSend,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const schema = useMemo(() => makeVenueOfferCounterSchema(t, maxGuests), [t, maxGuests]);
  const { control, handleSubmit, watch, setValue } = useForm<
    CounterOfferValues,
    unknown,
    CounterOfferValues
  >({
    resolver: formResolver<CounterOfferValues>(schema),
    defaultValues: edit ? venueOfferEditDefaults(terms) : venueOfferCounterDefaults(terms),
  });
  const [model, rate, minGuests, offerings] = watch(['model', 'rate', 'min_guests', 'offerings']);
  const typed = counterTermsOf({ model, rate, min_guests: minGuests, offerings });
  const send = handleSubmit((valid) => {
    const next = counterTermsOf(valid);
    if (next) onSend(next, valid.note.trim());
  });
  const copy = COPY[edit ? 'EDIT' : side];

  const footer = (
    <XStack gap={10}>
      <YStack flex={1}>
        <DuncitButton
          testID="venue-offer-counter-cancel"
          label={t('availability.offers.cancel')}
          onPress={onClose}
          variant="ghost"
          tone="neutral"
          disabled={busy}
          fullWidth
        />
      </YStack>
      <YStack flex={1}>
        <DuncitButton
          testID="venue-offer-counter-send"
          label={t(copy.send)}
          onPress={() => fireAndForget(send())}
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
      title={t(copy.title)}
      subtitle={t(copy.hint)}
      closeLabel={t('mweb.common.close')}
      dismissOnBackdrop={!busy}
      footer={footer}
    >
      <YStack gap={12}>
        {error ? (
          <Text testID="venue-offer-counter-error" role="alert" fontSize={13} color="$danger">
            {error}
          </Text>
        ) : null}
        <CounterOfferFields
          control={control}
          setValue={setValue}
          model={model}
          side={side}
          maxGuests={maxGuests}
        />
        <CounterQuotePreview target={target} side={side} terms={typed} />
      </YStack>
    </DuncitDialog>
  );
}
