import { Controller, type Control, type UseFormSetValue } from 'react-hook-form';

import { FormTextField } from '@/components/FormTextField';
import { MediaUploadField } from '@/components/create-pod/MediaUploadField';
import type { useVenueSlots } from '@/hooks/useVenueSlots';
import { useTranslation } from '@/hooks/useTranslation';
import { SlotPickerField, VenuePickerField } from '../ResubmitPickers';
import type { PodResubmitValues, ResubmitVenueOption } from '../pod-resubmit.form';

interface ResubmitFieldsProps {
  control: Control<PodResubmitValues>;
  setValue: UseFormSetValue<PodResubmitValues>;
  venues: ResubmitVenueOption[];
  slots: ReturnType<typeof useVenueSlots>['slots'];
  slotsLoading: boolean;
  venueId: string;
}

/** Title, description, venue, slot and media — the resubmission's fields. */
export function ResubmitFields({
  control,
  setValue,
  venues,
  slots,
  slotsLoading,
  venueId,
}: Readonly<ResubmitFieldsProps>) {
  const { t } = useTranslation();
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
              setValue('venue_slot_id', '');
            }}
          />
        )}
      />
      <Controller
        control={control}
        name="venue_slot_id"
        render={({ field, fieldState }) => (
          <SlotPickerField
            slots={slots}
            loading={slotsLoading}
            hasVenue={!!venueId}
            value={field.value}
            error={fieldState.error?.message}
            onChange={field.onChange}
          />
        )}
      />
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
