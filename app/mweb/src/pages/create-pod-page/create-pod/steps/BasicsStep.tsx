import { Stack, TextField } from '@mui/material';
import HashtagChipsField from '../fields/HashtagChipsField';
import MediaUrlsField from '../fields/MediaUrlsField';
import OptionalSettingsCards from '../OptionalSettingsCards';
import type { CreatePodForm } from '../create-pod.types';

interface Props {
  form: CreatePodForm;
}

/** Step 1 — Pod Basics: title, description, cover media and hashtags, with
 * optional extras (info, offers, perks) surfaced as tap-to-edit cards. */
export default function BasicsStep({ form }: Readonly<Props>) {
  const {
    register,
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
      <MediaUrlsField form={form} />
      <HashtagChipsField form={form} />
      <OptionalSettingsCards form={form} />
    </Stack>
  );
}
