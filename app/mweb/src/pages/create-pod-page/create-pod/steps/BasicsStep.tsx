import { Controller } from 'react-hook-form';
import { Stack, TextField } from '@mui/material';
import HashtagChipsField from '../fields/HashtagChipsField';
import MediaUrlsField from '../fields/MediaUrlsField';
import PodReelAccordion from '../fields/PodReelAccordion';
import ChipArrayField from '../fields/ChipArrayField';
import OptionalSettingsCards from '../OptionalSettingsCards';
import type { CreatePodForm } from '../create-pod.types';

interface Props {
  form: CreatePodForm;
}

/** Step 1 — Pod Basics: title, description, cover media, hashtags and the
 * required "what this pod offers" list, with optional extras (info, perks)
 * and an optional Pod Reel video that shows in Explore while the pod is live. */
export default function BasicsStep({ form }: Readonly<Props>) {
  const {
    register,
    control,
    formState: { errors },
  } = form;

  return (
    <Stack spacing={2.25}>
      <TextField
        label="Pod title"
        required
        fullWidth
        placeholder="e.g. Downtown Runners Club"
        {...register('pod_title')}
        error={!!errors.pod_title}
        helperText={errors.pod_title?.message ?? 'What is this pod about? (3–120 characters)'}
      />
      <TextField
        label="Description"
        required
        fullWidth
        multiline
        minRows={4}
        placeholder="Describe the purpose, vibe, and what members can expect…"
        {...register('pod_description')}
        error={!!errors.pod_description}
        helperText={errors.pod_description?.message ?? 'Tell people what to expect — agenda, vibe, who it is for'}
      />
      <Controller
        control={control}
        name="media_text"
        render={({ field, fieldState }) => (
          <MediaUrlsField
            value={field.value}
            onChange={field.onChange}
            error={fieldState.error?.message}
          />
        )}
      />
      <Controller
        control={control}
        name="what_this_pod_offers"
        render={({ field, fieldState }) => (
          <ChipArrayField
            label="What this pod offers *"
            value={field.value}
            onChange={field.onChange}
            error={fieldState.error?.message}
            placeholder="e.g. Coaching, Snacks, Equipment"
          />
        )}
      />
      <HashtagChipsField form={form} />
      <OptionalSettingsCards form={form} />
      <PodReelAccordion form={form} />
    </Stack>
  );
}
