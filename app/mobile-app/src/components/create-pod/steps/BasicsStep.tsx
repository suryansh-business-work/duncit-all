import { Controller } from 'react-hook-form';
import { YStack } from 'tamagui';

import { FormTextField } from '@/components/FormTextField';
import { HashtagChipsField } from '../HashtagChipsField';
import { MediaUploadField } from '../MediaUploadField';
import { ChipArrayField } from '../ChipArrayField';
import { OptionalSettingsCards } from '../OptionalSettingsCards';
import { ReelUploadField } from '../ReelUploadField';
import type { CreatePodForm } from '../create-pod.types';

interface Props {
  form: CreatePodForm;
}

/** Step 1 — Pod Basics: title, description, cover media, hashtags and the
 * required "what this pod offers" list, with optional extras (info, perks). */
export function BasicsStep({ form }: Readonly<Props>) {
  const { control } = form;
  return (
    <YStack gap={14}>
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
