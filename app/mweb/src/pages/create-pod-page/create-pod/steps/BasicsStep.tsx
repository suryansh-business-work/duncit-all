import { Controller } from 'react-hook-form';
import { Box, Stack, TextField } from '@mui/material';
import HashtagChipsField from '../fields/HashtagChipsField';
import MediaUrlsField from '../fields/MediaUrlsField';
import { MAX_COVER_IMAGES, coverCategoryName } from '@duncit/utils';
import { hostCategoryKeyOf } from '../create-pod.form';
import PodReelAccordion from '../fields/PodReelAccordion';
import ReelEngagementNotice from '../fields/ReelEngagementNotice';
import ChipArrayField from '../fields/ChipArrayField';
import OptionalSettingsCards from '../OptionalSettingsCards';
import { requiredLabel } from '../../../../forms/components/requiredLabel';
import { useTranslation } from '../../../../i18n/useTranslation';
import { SURFACE_SX } from '../../../../theme';
import type { CreatePodForm, CreatePodHostCategory } from '../create-pod.types';

interface Props {
  form: CreatePodForm;
  hostCategories: CreatePodHostCategory[];
}

/** Step 2 — Pod Basics: title, description, cover media, hashtags and the
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

  // The host picked the category on step 1, and the server already
  // denormalised its name onto the host record — so the cover picker can open
  // on a search for it without another query. `coverCategoryName` falls back to
  // the parent levels, because a host whose sub-category name was never
  // denormalised would otherwise open the picker on a blank search.
  const categoryKey = watch('host_category_key');
  const subCategoryName = coverCategoryName(
    hostCategories.find((category) => hostCategoryKeyOf(category) === categoryKey),
  );
  // The reel nudge is the only thing on this step that reacts to the reel,
  // and it goes away the moment one is added.
  const hasReel = !!watch('reel_url');

  return (
    <Stack data-testid="create-pod-basics-step" spacing={2}>
      <Stack spacing={2} sx={{ ...SURFACE_SX, p: 2 }}>
        <TextField
          data-testid="pod_title"
          label={requiredLabel(t('mweb.createPod.podTitleLabel'), true)}
          fullWidth
          placeholder={t('mweb.createPod.podTitlePlaceholder')}
          {...register('pod_title')}
          error={!!errors.pod_title}
          helperText={errors.pod_title?.message ?? t('mweb.createPod.podTitleHint')}
          slotProps={{ htmlInput: { 'data-testid': 'pod_title-input' } }}
        />
        <TextField
          data-testid="pod_description"
          label={requiredLabel(t('mweb.createPod.podDescriptionLabel'), true)}
          fullWidth
          multiline
          minRows={4}
          placeholder={t('mweb.createPod.podDescriptionPlaceholder')}
          {...register('pod_description')}
          error={!!errors.pod_description}
          helperText={errors.pod_description?.message ?? t('mweb.createPod.podDescriptionHint')}
          slotProps={{ htmlInput: { 'data-testid': 'pod_description-input' } }}
        />
      </Stack>
      <Box sx={{ ...SURFACE_SX, p: 2 }}>
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
      </Box>
      <Stack spacing={2} sx={{ ...SURFACE_SX, p: 2 }}>
        <Controller
          control={control}
          name="what_this_pod_offers"
          render={({ field, fieldState }) => (
            <ChipArrayField
              testId="create-pod-offers"
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
      </Stack>
      <OptionalSettingsCards form={form} />
      {!hasReel && <ReelEngagementNotice />}
      <PodReelAccordion form={form} />
    </Stack>
  );
}
