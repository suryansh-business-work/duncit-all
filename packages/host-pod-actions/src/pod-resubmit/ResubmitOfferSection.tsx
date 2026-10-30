import { Controller, type UseFormReturn } from 'react-hook-form';
import { FormControlLabel, Switch } from '@mui/material';
import { FreeArrangementFields, VenueOfferAskFields } from '@duncit/forms';
import { VENUE_OFFER_ASK_LIMITS } from '@duncit/utils';
import { useAskTranslation } from './ask-translation';
import OfferTermsFields from './OfferTermsFields';
import ResubmitSpotsField from './ResubmitSpotsField';
import { OfferWindowField } from './VenueSlotFields';
import { needsResubmitFreeJustification, type PodResubmitValues } from './pod-resubmit.form';
import { useResubmitVenueTerms } from './useResubmitVenueTerms';

interface Props {
  form: UseFormReturn<PodResubmitValues, unknown, PodResubmitValues>;
}

const PICKED = { shouldValidate: true } as const;

/** Where the form holds the free justification. */
const FREE_NAMES = { reason: 'free_reason', details: 'free_details', accepted: 'free_accepted' } as const;

/**
 * The new offer to the picked venue: a window it is open and free for, the
 * spots (its guests, from the venue's minimum), whether pets come, how the
 * host pays it and how much, and what they need from it with an optional note
 * — the same ask Create Pod makes, with the same shared fields. A free pod, or
 * a venue asked for free, adds Duncit's free policy, why it is free and the
 * host's acceptance.
 */
export default function ResubmitOfferSection({ form }: Readonly<Props>) {
  const { t } = useAskTranslation();
  const { control, watch, setValue, formState } = form;
  const venueId = watch('venue_id');
  const terms = useResubmitVenueTerms(venueId, watch('space_label'));
  const free = needsResubmitFreeJustification({ pod_type: watch('pod_type'), venue_offer_model: watch('venue_offer_model') });
  const setWindow = (start: string, end: string) => {
    setValue('offer_start', start, PICKED);
    setValue('offer_end', end, PICKED);
  };

  return (
    <>
      <OfferWindowField
        venueId={venueId}
        spaceLabel={watch('space_label')}
        start={watch('offer_start')}
        end={watch('offer_end')}
        error={formState.errors.offer_start?.message}
        onWindow={setWindow}
      />
      {venueId && (
        <>
          <ResubmitSpotsField form={form} terms={terms} />
          <Controller
            control={control}
            name="pets"
            render={({ field }) => (
              <FormControlLabel
                control={
                  <Switch
                    checked={field.value}
                    onChange={(event) => field.onChange(event.target.checked)}
                    data-testid="pod-resubmit-pets"
                  />
                }
                label={t('availability.offers.pets')}
              />
            )}
          />
          <OfferTermsFields control={control} />
          <VenueOfferAskFields
            control={control}
            offeringsName="offerings"
            noteName="note"
            idPrefix="pod-resubmit"
            required
            labels={{
              offerings: t('availability.offers.ask.offeringsLabel'),
              offeringsHint: t('availability.offers.ask.offeringsHint'),
              note: t('availability.offers.ask.noteLabel'),
              noteHint: t('availability.offers.ask.noteHint', { vars: { max: VENUE_OFFER_ASK_LIMITS.note } }),
            }}
          />
        </>
      )}
      {free && <FreeArrangementFields control={control} names={FREE_NAMES} t={t} idPrefix="pod-resubmit" />}
    </>
  );
}
