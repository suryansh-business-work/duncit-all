import { Controller } from 'react-hook-form';
import { Text, YStack } from 'tamagui';

import { FormTextField } from '@/components/FormTextField';
import { ChipArrayField } from '../ChipArrayField';
import { HashtagChipsField } from '../HashtagChipsField';
import { MediaUploadField } from '../MediaUploadField';
import type { CreatePodForm } from '../create-pod.types';

interface Props {
  form: CreatePodForm;
}

/** Step 1 — Pod Basics: title, description, feature image(s), hashtags and
 * optional extras (info, offers, perks). Mobile twin of mWeb's BasicsStep. */
export function BasicsStep({ form }: Readonly<Props>) {
  const { control } = form;
  return (
    <YStack gap={14}>
      <FormTextField control={control} name="pod_title" label="Pod title" />
      <FormTextField control={control} name="pod_description" label="Pod description" multiline />
      <Controller
        control={control}
        name="media_text"
        render={({ field, fieldState }) => (
          <MediaUploadField
            value={field.value}
            onChange={field.onChange}
            error={fieldState.error?.message}
          />
        )}
      />
      <HashtagChipsField form={form} />
      <Text fontSize={13} fontWeight="800" color="$muted">
        More details (optional)
      </Text>
      <FormTextField control={control} name="pod_info" label="Pod info" multiline />
      <Controller
        control={control}
        name="what_this_pod_offers"
        render={({ field, fieldState }) => (
          <ChipArrayField
            label="What this pod offers"
            value={field.value}
            onChange={field.onChange}
            error={fieldState.error?.message}
            placeholder="e.g. Coaching, Snacks"
            testID="create-pod-offers"
          />
        )}
      />
      <Controller
        control={control}
        name="available_perks"
        render={({ field, fieldState }) => (
          <ChipArrayField
            label="Available perks"
            value={field.value}
            onChange={field.onChange}
            error={fieldState.error?.message}
            placeholder="e.g. Free parking, Goodies"
            testID="create-pod-perks"
          />
        )}
      />
    </YStack>
  );
}
