import { Controller, useFormContext } from 'react-hook-form';
import ChipArrayField from '../components/ChipArrayField';
import type { PodFormValues } from '../types';
import { useTranslation } from '../i18n/useTranslation';

export default function OffersSection() {
  const { t } = useTranslation();
  const { control } = useFormContext<PodFormValues>();
  return (
    <Controller
      control={control}
      name="what_this_pod_offers"
      render={({ field }) => (
        <ChipArrayField
          label={t('podForm.offersSection.amenitiesAndFacilities')}
          value={field.value}
          onChange={field.onChange}
          placeholder={t('podForm.offersSection.eGFreeWifiParkingPet')}
          helperText={t('podForm.offersSection.pressEnterToAddAChip')}
        />
      )}
    />
  );
}
