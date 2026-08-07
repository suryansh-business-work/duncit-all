import { Controller } from 'react-hook-form';
import { YStack } from 'tamagui';

import { FormTextField } from '@/components/FormTextField';
import { HashtagChipsField } from '../HashtagChipsField';
import { MediaUploadField } from '../MediaUploadField';
import { hostCategoryKeyOf } from '../create-pod.form';
import { ChipArrayField } from '../ChipArrayField';
import { OptionalSettingsCards } from '../OptionalSettingsCards';
import { ReelUploadField } from '../ReelUploadField';
import { HostCategoryField } from './HostCategoryField';
import type { CreatePodForm, CreatePodHostCategory } from '../create-pod.types';

interface Props {
  form: CreatePodForm;
  hostCategories: CreatePodHostCategory[];
}

/** Step 1 — Pod Basics: title, description, cover media, hashtags and the
 * required "what this pod offers" list, with optional extras (info, perks). */
export function BasicsStep({ form, hostCategories }: Readonly<Props>) {
  const { control, watch } = form;
  // The host picks the category above the media field, and the server already
  // denormalised its name onto the host record — so the cover picker can open on
  // a search for it without another query.
  const categoryKey = watch('host_category_key');
  const subCategoryName = hostCategories.find(
    (category) => hostCategoryKeyOf(category) === categoryKey,
  )?.sub_category_name;
  return (
    <YStack gap={14}>
      {/* First field of the form: the category scopes the clubs on step 2 AND
          the products on step 4, so it is picked before the title. mWeb twin
          (rule 27). */}
      <HostCategoryField form={form} hostCategories={hostCategories} />
      <FormTextField
        control={control}
        name="pod_title"
        label="Pod title"
        required
        hint="3–120 characters"
      />
      <FormTextField
        control={control}
        name="pod_description"
        label="Pod description"
        multiline
        required
        hint="At least 10 characters"
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
            testID="create-pod-offers"
          />
        )}
      />
      <HashtagChipsField form={form} />
      <OptionalSettingsCards form={form} />
      <Controller
        control={control}
        name="reel_url"
        render={({ field }) => <ReelUploadField value={field.value} onChange={field.onChange} />}
      />
    </YStack>
  );
}
