import { Controller } from 'react-hook-form';
import { YStack } from 'tamagui';

import { FormTextField } from '@/components/FormTextField';
import { HashtagChipsField } from '../HashtagChipsField';
import { MediaUploadField } from '../MediaUploadField';
import { OptionalSettingsCards } from '../OptionalSettingsCards';
import type { CreatePodForm } from '../create-pod.types';

interface Props {
  form: CreatePodForm;
}

/** Step 1 — Pod Basics: title, description, cover media and hashtags, with
 * optional extras (info, offers, perks) as tap-to-expand cards. mWeb twin. */
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
      <OptionalSettingsCards form={form} />
    </YStack>
  );
}
