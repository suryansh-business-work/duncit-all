import { Controller } from 'react-hook-form';
import { YStack } from 'tamagui';

import { FormTextField } from '@/components/FormTextField';
import { ChipSelectField } from '../ChipSelectField';
import { ClubSearchField } from '../ClubSearchField';
import type { CreatePodClub, CreatePodForm } from '../create-pod.types';

const MODES = [
  { value: 'PHYSICAL', label: 'Physical' },
  { value: 'VIRTUAL', label: 'Virtual' },
];

interface Props {
  form: CreatePodForm;
  clubs: CreatePodClub[];
}

/** Step 1 — title, mode, searchable club (host = signed-in user) and hashtags. */
export function ClubStep({ form, clubs }: Readonly<Props>) {
  const { control, setValue } = form;
  return (
    <YStack gap={14}>
      <FormTextField control={control} name="pod_title" label="Pod title" />
      <Controller
        control={control}
        name="pod_mode"
        render={({ field }) => (
          <ChipSelectField
            label="Mode"
            options={MODES}
            value={field.value}
            onChange={field.onChange}
            testID="create-pod-mode"
          />
        )}
      />
      <Controller
        control={control}
        name="club_id"
        render={({ field, fieldState }) => (
          <ClubSearchField
            clubs={clubs}
            value={field.value}
            onChange={(id) => {
              field.onChange(id);
              setValue('venue_id', '');
            }}
            error={fieldState.error?.message}
          />
        )}
      />
      <FormTextField
        control={control}
        name="pod_hashtag_text"
        label="Hashtags"
        placeholder="#weekend #community"
      />
    </YStack>
  );
}
