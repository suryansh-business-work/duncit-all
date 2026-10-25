import type { Control, FieldValues, Path } from 'react-hook-form';
import { YStack } from 'tamagui';
import { VENUE_OFFER_ASK_LIMITS } from '@duncit/utils';

import { FormTextField } from '@/components/FormTextField';
import { useTranslation } from '@/hooks/useTranslation';

interface Props<T extends FieldValues> {
  control: Control<T>;
  /** The form's "what you need from the venue" text (one point per line). */
  offeringsName: Path<T>;
  /** The form's request note to the venue. */
  noteName: Path<T>;
}

/**
 * What the host asks of the venue beside the price: the points it should
 * provide (one per line, at least one) and an optional note. Bound to any form
 * by field name — Create Pod and the resubmit sheet both draw it, with the
 * shared rules (`makeVenueOfferAskSchema` / `offeringsTextField`). mWeb twin:
 * @duncit/forms VenueOfferAskFields.
 */
export function OfferAskFields<T extends FieldValues>({
  control,
  offeringsName,
  noteName,
}: Readonly<Props<T>>) {
  const { t } = useTranslation();
  return (
    <YStack gap={12} testID="offer-ask-fields">
      <FormTextField
        control={control}
        name={offeringsName}
        label={t('availability.offers.ask.offeringsLabel')}
        hint={t('availability.offers.ask.offeringsHint')}
        multiline
        numberOfLines={4}
        required
      />
      <FormTextField
        control={control}
        name={noteName}
        label={t('availability.offers.ask.noteLabel')}
        hint={t('availability.offers.ask.noteHint', {
          vars: { max: VENUE_OFFER_ASK_LIMITS.note },
        })}
        multiline
        numberOfLines={3}
        maxLength={VENUE_OFFER_ASK_LIMITS.note}
      />
    </YStack>
  );
}
