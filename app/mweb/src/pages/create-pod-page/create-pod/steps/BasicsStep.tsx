import { Controller } from 'react-hook-form';
import { Box, Stack, TextField } from '@mui/material';
import HashtagChipsField from '../fields/HashtagChipsField';
import MediaUrlsField from '../fields/MediaUrlsField';
import { MAX_COVER_IMAGES, coverCategoryName } from '@duncit/utils';
import { hostCategoryKeyOf } from '../create-pod.form';
import PodReelAccordion from '../fields/PodReelAccordion';
import ChipArrayField from '../fields/ChipArrayField';
import OptionalSettingsCards from '../OptionalSettingsCards';
import { requiredLabel } from '../../../../forms/components/requiredLabel';
import HostCategoryField from './HostCategoryField';
import { useTranslation } from '../../../../i18n/useTranslation';
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
  const { t } = useTranslation();

  // The host picks the category above the media field, and the server already
  // denormalised its name onto the host record — so the cover picker can open
  // on a search for it without another query. `coverCategoryName` falls back to
  // the parent levels, because a host whose sub-category name was never
  // denormalised would otherwise open the picker on a blank search.
  const categoryKey = watch('host_category_key');
  const subCategoryName = coverCategoryName(
    hostCategories.find((category) => hostCategoryKeyOf(category) === categoryKey),
  );

  return (
    <Stack spacing={2.25}>
      {/* First field of the form: the category scopes the clubs on step 2 AND
          the products on step 4, so it is picked before the title. Native twin
          (rule 27). */}
      <HostCategoryField form={form} hostCategories={hostCategories} />
      {/* The title field alone, matching native: this step is about the one line
          people read first, and a taller highlight reads as "everything". */}
      <Box data-tour="create-pod-basics">
        <TextField
          label={requiredLabel(t('mweb.createPod.podTitleLabel'), true)}
          fullWidth
          placeholder={t('mweb.createPod.podTitlePlaceholder')}
          {...register('pod_title')}
          error={!!errors.pod_title}
          helperText={errors.pod_title?.message ?? t('mweb.createPod.podTitleHint')}
        />
      </Box>
      <TextField
        label={requiredLabel(t('mweb.createPod.podDescriptionLabel'), true)}
        fullWidth
        multiline
        minRows={4}
        placeholder={t('mweb.createPod.podDescriptionPlaceholder')}
        {...register('pod_description')}
        error={!!errors.pod_description}
        helperText={errors.pod_description?.message ?? t('mweb.createPod.podDescriptionHint')}
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
            maxImages={MAX_COVER_IMAGES}
          />
        )}
      />
      <Controller
        control={control}
        name="what_this_pod_offers"
        render={({ field, fieldState }) => (
          <ChipArrayField
            label={t('mweb.createPod.offersLabel')}
            required
            value={field.value}
            onChange={field.onChange}
            error={fieldState.error?.message}
            placeholder={t('mweb.createPod.offersPlaceholder')}
          />
        )}
      />
      <HashtagChipsField form={form} />
      <OptionalSettingsCards form={form} />
      <PodReelAccordion form={form} />
    </Stack>
  );
}
