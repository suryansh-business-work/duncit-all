import { Controller } from 'react-hook-form';

import { FormTextField } from '@/components/FormTextField';
import { MediaUploadField } from '@/components/create-pod/MediaUploadField';
import { useTranslation } from '@/hooks/useTranslation';
import { VenuePickerField } from '../ResubmitPickers';
import type { ResubmitForm, ResubmitVenueOption } from '../pod-resubmit.form';
import { ResubmitOfferSection } from './ResubmitOfferSection';

interface ResubmitFieldsProps {
  form: ResubmitForm;
  venues: ResubmitVenueOption[];
}

/** Title, description, venue, the new offer to it, and media — the resubmission's fields. */
export function ResubmitFields({ form, venues }: Readonly<ResubmitFieldsProps>) {
  const { t } = useTranslation();
  const { control, setValue } = form;
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
              // The window and the space belonged to the venue just dropped.
              setValue('offer_start', '');
              setValue('offer_end', '');
              setValue('space_label', '');
            }}
          />
        )}
      />
      <ResubmitOfferSection form={form} />
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
