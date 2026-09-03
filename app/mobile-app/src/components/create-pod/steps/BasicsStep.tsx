import { Controller } from 'react-hook-form';
import { YStack } from 'tamagui';

import { FormTextField } from '@/components/FormTextField';
import { TourAnchor } from '@/tours/TourAnchor';
import { HashtagChipsField } from '../HashtagChipsField';
import { MediaUploadField } from '../MediaUploadField';
import { MAX_COVER_IMAGES, coverCategoryName } from '@duncit/utils';
import { hostCategoryKeyOf } from '../create-pod.form';
import { ChipArrayField } from '../ChipArrayField';
import { OptionalSettingsCards } from '../OptionalSettingsCards';
import { ReelEngagementNotice } from '../ReelEngagementNotice';
import { ReelUploadField } from '../ReelUploadField';
import { HostCategoryField } from './HostCategoryField';
import { useTranslation } from '@/hooks/useTranslation';
import type { CreatePodForm, CreatePodHostCategory } from '../create-pod.types';

interface Props {
  form: CreatePodForm;
  hostCategories: CreatePodHostCategory[];
  /** Off in Club Admin mode — the pod's category is the pinned club's own. */
  showCategory?: boolean;
}

/** Step 1 — Pod Basics: title, description, cover media, hashtags and the
 * required "what this pod offers" list, with optional extras (info, perks). */
export function BasicsStep({ form, hostCategories, showCategory = true }: Readonly<Props>) {
  const { control, watch } = form;
  const { t } = useTranslation();
  // The host picks the category above the media field, and the server already
  // denormalised its name onto the host record — so the cover picker can open on
  // a search for it without another query. `coverCategoryName` falls back to the
  // parent levels, because a host whose sub-category name was never denormalised
  // would otherwise open the picker on a blank search.
  const categoryKey = watch('host_category_key');
  const subCategoryName = coverCategoryName(
    hostCategories.find((category) => hostCategoryKeyOf(category) === categoryKey),
  );
  return (
    <YStack gap={14}>
      {/* First field of the form: the category scopes the clubs on step 2 AND
          the products on step 4, so it is picked before the title. mWeb twin
          (rule 27). */}
      {showCategory ? <HostCategoryField form={form} hostCategories={hostCategories} /> : null}
      {/* The title field alone, not the title/description/photo group: the
          native overlay cannot scroll a target into view, so a highlight taller
          than the viewport is one the host never sees. */}
      <TourAnchor tour="create-pod" anchor="create-pod-basics">
        <FormTextField
          control={control}
          name="pod_title"
          label={t('mweb.createPod.podTitleLabel')}
          required
          hint={t('mweb.createPod.podTitleHint')}
        />
      </TourAnchor>
      <FormTextField
        control={control}
        name="pod_description"
        label={t('mweb.createPod.podDescriptionLabel')}
        multiline
        required
        hint={t('mweb.createPod.podDescriptionHint')}
      />
      <Controller
        control={control}
        name="media_text"
        render={({ field, fieldState }) => (
          <MediaUploadField
            value={field.value}
            onChange={field.onChange}
            error={fieldState.error?.message}
            required
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
            testID="create-pod-offers"
          />
        )}
      />
      <HashtagChipsField form={form} />
      <OptionalSettingsCards form={form} />
      <Controller
        control={control}
        name="reel_url"
        render={({ field }) => (
          // The nudge reads from outside the collapsed card, so it lives beside
          // the field rather than inside it, and clears once a reel is added.
          <YStack gap={14}>
            {field.value ? null : <ReelEngagementNotice />}
            <ReelUploadField value={field.value} onChange={field.onChange} />
          </YStack>
        )}
      />
    </YStack>
  );
}
