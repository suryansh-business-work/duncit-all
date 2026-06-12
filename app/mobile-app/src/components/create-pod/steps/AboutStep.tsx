import { Controller } from 'react-hook-form';
import { YStack } from 'tamagui';

import { FormTextField } from '@/components/FormTextField';
import { MediaUploadField } from '../MediaUploadField';
import type { CreatePodForm } from '../create-pod.types';

interface Props {
  form: CreatePodForm;
}

/** Step 3 — description, extra info and media URLs. */
export function AboutStep({ form }: Readonly<Props>) {
  return (
    <YStack gap={14}>
      <FormTextField control={form.control} name="pod_description" label="Description" multiline />
      <FormTextField control={form.control} name="pod_info" label="Pod info" multiline />
      <Controller
        control={form.control}
        name="media_text"
        render={({ field, fieldState }) => (
          <MediaUploadField
            value={field.value}
            onChange={field.onChange}
            error={fieldState.error?.message}
          />
        )}
      />
    </YStack>
  );
}
