import { Controller, useController } from 'react-hook-form';

import { ToggleRow } from '@/components/ToggleRow';
import { OfferAskFields } from '@/components/create-pod/steps/VenueSlotStep/OfferAskFields';
import { OfferTermsInputs } from '@/components/create-pod/steps/VenueSlotStep/OfferTermsFields';
import { useTranslation } from '@/hooks/useTranslation';
import { OfferWindowPicker } from '../ResubmitPickers';
import type { ResubmitForm } from '../pod-resubmit.form';
import { ResubmitSpotsField } from './ResubmitSpotsField';
import { useResubmitVenueTerms } from './useResubmitVenueTerms';

const PICKED = { shouldDirty: true, shouldValidate: true } as const;

/**
 * The new offer to the picked venue: a window it is open and free for (for the
 * space offered), the spots (its guests, from the venue's minimum), whether
 * pets come, how the host pays it and how much, and what they need from it
 * with an optional note — the same ask Create Pod makes, with the same shared
 * fields. mWeb twin: ResubmitOfferSection.
 */
export function ResubmitOfferSection({ form }: Readonly<{ form: ResubmitForm }>) {
  const { t } = useTranslation();
  const { control, setValue, watch } = form;
  const venueId = watch('venue_id');
  const spaceLabel = watch('space_label');
  const terms = useResubmitVenueTerms(venueId, spaceLabel);
  const start = useController({ control, name: 'offer_start' });
  const end = useController({ control, name: 'offer_end' });
  const model = useController({ control, name: 'venue_offer_model' });
  const rate = useController({ control, name: 'venue_offer_rate' });

  return (
    <>
      <OfferWindowPicker
        venueId={venueId}
        spaceLabel={spaceLabel}
        start={start.field.value}
        end={end.field.value}
        error={start.fieldState.error?.message}
        onWindow={(nextStart, nextEnd) => {
          setValue('offer_start', nextStart, PICKED);
          setValue('offer_end', nextEnd, PICKED);
        }}
      />
      {venueId ? (
        <>
          <ResubmitSpotsField form={form} terms={terms} />
          <Controller
            control={control}
            name="pets"
            render={({ field }) => (
              <ToggleRow
                testID="pod-resubmit-pets"
                label={t('availability.offers.pets')}
                value={field.value}
                onChange={field.onChange}
              />
            )}
          />
          <OfferTermsInputs
            model={model.field.value}
            rate={rate.field.value}
            onModel={model.field.onChange}
            onRate={rate.field.onChange}
            modelError={model.fieldState.error?.message}
            rateError={rate.fieldState.error?.message}
          />
          <OfferAskFields control={control} offeringsName="offerings" noteName="note" />
        </>
      ) : null}
    </>
  );
}
