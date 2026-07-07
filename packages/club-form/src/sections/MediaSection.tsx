import { Stack } from '@mui/material';
import { Controller, useFormContext, useFormState } from 'react-hook-form';
import MediaField from '../components/MediaField';
import { useClubFormData } from '../context';
import type { ClubFormValues } from '../types';

/** Feature media (≥1 image required) + club moments. */
export default function MediaSection() {
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
            label="Feature images & videos"
            value={field.value}
            onChange={field.onChange}
            folder="/clubs"
            onPickImage={onPickImage}
            error={errors.feature_text?.message}
            helperText="Cover/header media shown on the club page — at least one image is required."
          />
        )}
      />
      <Controller
        control={control}
        name="moments_text"
        render={({ field }) => (
          <MediaField
            label="Club moments"
            value={field.value}
            onChange={field.onChange}
            folder="/clubs/moments"
            onPickImage={onPickImage}
            helperText="Past event photos."
          />
        )}
      />
    </Stack>
  );
}
