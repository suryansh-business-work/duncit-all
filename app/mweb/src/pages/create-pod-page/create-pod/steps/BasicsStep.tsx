import { Controller } from 'react-hook-form';
import { Stack, TextField } from '@mui/material';
import HashtagChipsField from '../fields/HashtagChipsField';
import MediaUrlsField from '../fields/MediaUrlsField';
import { hostCategoryKeyOf } from '../create-pod.form';
import PodReelAccordion from '../fields/PodReelAccordion';
import ChipArrayField from '../fields/ChipArrayField';
import OptionalSettingsCards from '../OptionalSettingsCards';
import { requiredLabel } from '../../../../forms/components/requiredLabel';
import HostCategoryField from './HostCategoryField';
import type { CreatePodForm, CreatePodHostCategory } from '../create-pod.types';

interface Props {
  form: CreatePodForm;
  hostCategories: CreatePodHostCategory[];
}

/** Step 1 — Pod Basics: title, description, cover media, hashtags and the
 * required "what this pod offers" list, with optional extras (info, perks)
 * and an optional Pod Reel video that shows in Explore while the pod is live. */
export default function BasicsStep({ form, hostCategories }: Readonly<Props>) {
  const {
    register,
    control,
    watch,
    formState: { errors },
  } = form;

  // The host picks the category above the media field, and the server already
  // denormalised its name onto the host record — so the cover picker can open
  // on a search for it without another query.
  const categoryKey = watch('host_category_key');
  const subCategoryName = hostCategories.find(
    (category) => hostCategoryKeyOf(category) === categoryKey,
  )?.sub_category_name;

  return (
    <Stack spacing={2.25}>
      {/* First field of the form: the category scopes the clubs on step 2 AND
          the products on step 4, so it is picked before the title. Native twin
          (rule 27). */}
      <HostCategoryField form={form} hostCategories={hostCategories} />
      <TextField
        label={requiredLabel('Pod title', true)}
        fullWidth
        placeholder="e.g. Downtown Runners Club"
        {...register('pod_title')}
        error={!!errors.pod_title}
        helperText={errors.pod_title?.message ?? 'What is this pod about? (3–120 characters)'}
      />
      <TextField
        label={requiredLabel('Description', true)}
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
            subCategoryName={subCategoryName}
          />
        )}
      />
      <Controller
        control={control}
        name="what_this_pod_offers"
        render={({ field, fieldState }) => (
          <ChipArrayField
            label="What this pod offers"
            required
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
