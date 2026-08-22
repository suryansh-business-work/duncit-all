import { Controller, useFormContext } from 'react-hook-form';
import ChipArrayField from '../components/ChipArrayField';
import type { PodFormValues } from '../types';
import { useTranslation } from '../i18n/useTranslation';

export default function PerksSection() {
  const { t } = useTranslation();
  const { control } = useFormContext<PodFormValues>();
  return (
    <Controller
      control={control}
      name="available_perks"
      render={({ field }) => (
        <ChipArrayField
          label={t('podForm.common.availablePerks')}
          value={field.value}
          onChange={field.onChange}
          placeholder={t('podForm.perksSection.eGFreeDrinkEarlyEntry')}
          helperText={t('podForm.perksSection.perksAttendeesUnlockByJoining')}
        />
      )}
    />
  );
}
