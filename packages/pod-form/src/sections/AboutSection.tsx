import { useFormContext } from 'react-hook-form';
import { Stack, TextField } from '@mui/material';
import RhfTextField from '../components/RhfTextField';
import type { PodFormValues } from '../types';
import { useTranslation } from '../i18n/useTranslation';

export default function AboutSection() {
  const { t } = useTranslation();
  const { control, register } = useFormContext<PodFormValues>();
  return (
    <Stack spacing={2}>
      <RhfTextField
        control={control}
        name="pod_description"
        label={t('podForm.common.description')}
        required
        multiline
        minRows={3}
        hint="At least 10 characters"
      />
      <TextField
        label={t('podForm.aboutSection.podInfoAdditionalNotes')}
        fullWidth
        multiline
        minRows={2}
        helperText={t('podForm.aboutSection.logisticsWhatToBringParkingNotes')}
        {...register('pod_info')}
      />
    </Stack>
  );
}
