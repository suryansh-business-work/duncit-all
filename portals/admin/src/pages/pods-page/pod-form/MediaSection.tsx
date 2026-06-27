import { Controller, useFormContext } from 'react-hook-form';
import MediaListField from '../../../components/MediaListField';
import type { PodForm } from '../queries';

export default function MediaSection() {
  const { control } = useFormContext<PodForm>();
  return (
    <Controller
      control={control}
      name="media_text"
      render={({ field }) => (
        <MediaListField
          label="Images & videos"
          value={field.value}
          onChange={field.onChange}
          folder="/pods"
          helperText="Cover image first; rest become a gallery."
        />
      )}
    />
  );
}
