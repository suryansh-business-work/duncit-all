import { Controller, useController } from 'react-hook-form';

import { ToggleRow } from '@/components/ToggleRow';
import {
  FREE_JUSTIFICATION_NAMES,
  FreeArrangementFields,
} from '@/components/create-pod/free-arrangement';
import { OfferAskFields } from '@/components/create-pod/steps/VenueSlotStep/OfferAskFields';
import { OfferTermsInputs } from '@/components/create-pod/steps/VenueSlotStep/OfferTermsFields';
import { useTranslation } from '@/hooks/useTranslation';
import { OfferWindowPicker } from '../ResubmitPickers';
import { resubmitNeedsFreeJustification, type ResubmitForm } from '../pod-resubmit.form';
import { ResubmitSpotsField } from './ResubmitSpotsField';
import { useResubmitVenueTerms } from './useResubmitVenueTerms';

const PICKED = { shouldDirty: true, shouldValidate: true } as const;

/**
 * The new offer to the picked venue: a window it is open and free for (for the
 * space offered), the spots (its guests, from the venue's minimum), whether
 * pets come, how the host pays it and how much — or a free venue — and what
 * they need from it with an optional note — the same ask Create Pod makes, with
 * the same shared fields. A free venue or a free pod adds the free policy, its
 * reason and the host's acceptance. mWeb twin: ResubmitOfferSection.
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
  const needsFree = resubmitNeedsFreeJustification({
    venue_offer_model: model.field.value,
    pod_free: watch('pod_free'),
  });

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
            allowFree
          />
          {needsFree ? (
            <FreeArrangementFields
              control={control}
              names={FREE_JUSTIFICATION_NAMES}
              testIDPrefix="pod-resubmit"
            />
          ) : null}
          <OfferAskFields control={control} offeringsName="offerings" noteName="note" />
        </>
      ) : null}
    </>
  );
}
