import { Stack } from '@mui/material';
import { Controller, useFormContext, useFormState } from 'react-hook-form';
import MediaField from '../components/MediaField';
import { useClubFormData } from '../context';
import type { ClubFormValues } from '../types';
import { useTranslation } from '../i18n/useTranslation';

/** Feature media (≥1 image required) + club moments. */
export default function MediaSection() {
  const { t } = useTranslation();
  const { onPickImage } = useClubFormData();
  const { control } = useFormContext<ClubFormValues>();
  const { errors } = useFormState({ control });

  return (
    <Stack spacing={2}>
      <Controller
        control={control}
        name="feature_text"
        render={({ field }) => (
          <MediaField
            label={t('clubForm.mediaSection.featureImagesAndVideos')}
            value={field.value}
            onChange={field.onChange}
            folder="/clubs"
            required
            onPickImage={onPickImage}
            error={errors.feature_text?.message}
            helperText={t('clubForm.mediaSection.coverHeaderMediaShownOnThe')}
          />
        )}
      />
      <Controller
        control={control}
        name="moments_text"
        render={({ field }) => (
          <MediaField
            label={t('clubForm.common.clubMoments')}
            value={field.value}
            onChange={field.onChange}
            folder="/clubs/moments"
            onPickImage={onPickImage}
            helperText={t('clubForm.mediaSection.pastEventPhotos')}
          />
        )}
      />
    </Stack>
  );
}
