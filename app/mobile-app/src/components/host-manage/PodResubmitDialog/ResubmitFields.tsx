import { Controller, useController, type Control, type UseFormSetValue } from 'react-hook-form';

import { FormTextField } from '@/components/FormTextField';
import { MediaUploadField } from '@/components/create-pod/MediaUploadField';
import { OfferTermsInputs } from '@/components/create-pod/steps/VenueSlotStep/OfferTermsFields';
import { useTranslation } from '@/hooks/useTranslation';
import { OfferWindowPicker, VenuePickerField } from '../ResubmitPickers';
import type { PodResubmitValues, ResubmitVenueOption } from '../pod-resubmit.form';

interface ResubmitFieldsProps {
  control: Control<PodResubmitValues>;
  setValue: UseFormSetValue<PodResubmitValues>;
  venues: ResubmitVenueOption[];
  venueId: string;
}

const DIRTY = { shouldDirty: true, shouldValidate: true } as const;

/** Title, description, venue, the offered window and terms, and media — the resubmission's fields. */
export function ResubmitFields({
  control,
  setValue,
  venues,
  venueId,
}: Readonly<ResubmitFieldsProps>) {
  const { t } = useTranslation();
  const start = useController({ control, name: 'offer_start' });
  const end = useController({ control, name: 'offer_end' });
  const model = useController({ control, name: 'venue_offer_model' });
  const rate = useController({ control, name: 'venue_offer_rate' });
  return (
    <>
      <FormTextField
        control={control}
        name="pod_title"
        label={t('mweb.common.title')}
        required
        hint={t('mweb.hostPodActions.resubmitTitleLengthHint')}
      />
      <FormTextField
        control={control}
        name="pod_description"
        label={t('mweb.common.description')}
        multiline
        required
        hint={t('mweb.hostPodActions.resubmitDescriptionLengthHint')}
      />
      <Controller
        control={control}
        name="venue_id"
        render={({ field, fieldState }) => (
          <VenuePickerField
            venues={venues}
            value={field.value}
            error={fieldState.error?.message}
            onChange={(next) => {
              field.onChange(next);
              // The window belonged to the venue just dropped.
              setValue('offer_start', '');
              setValue('offer_end', '');
            }}
          />
        )}
      />
      <OfferWindowPicker
        venueId={venueId}
        start={start.field.value}
        end={end.field.value}
        error={start.fieldState.error?.message}
        onWindow={(nextStart, nextEnd) => {
          setValue('offer_start', nextStart, DIRTY);
          setValue('offer_end', nextEnd, DIRTY);
        }}
      />
      {venueId ? (
        <OfferTermsInputs
          model={model.field.value}
          rate={rate.field.value}
          onModel={model.field.onChange}
          onRate={rate.field.onChange}
          modelError={model.fieldState.error?.message}
          rateError={rate.fieldState.error?.message}
        />
      ) : null}
      <Controller
        control={control}
        name="media_text"
        render={({ field, fieldState }) => (
          <MediaUploadField
            value={field.value}
            onChange={field.onChange}
            error={fieldState.error?.message}
            label={t('mweb.hostManage.media')}
          />
        )}
      />
    </>
  );
}
