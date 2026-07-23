import { Controller } from 'react-hook-form';
import { Text, YStack } from 'tamagui';

import { ChipSelectField } from '../ChipSelectField';
import { hostCategoryKeyOf } from '../create-pod.form';
import type { CreatePodForm, CreatePodHostCategory } from '../create-pod.types';

const categoryPath = (category: CreatePodHostCategory) =>
  [category.super_category_name, category.category_name, category.sub_category_name]
    .filter(Boolean)
    .join(' › ');

interface Props {
  form: CreatePodForm;
  hostCategories: CreatePodHostCategory[];
}

/** Step-2 category picker — the host chooses which of their onboarded categories
 * this pod is for. Changing it resets the club/venue/slot picks. */
export function HostCategoryField({ form, hostCategories }: Readonly<Props>) {
  const { control, setValue } = form;
  const categoryOptions = hostCategories.map((category) => ({
    value: hostCategoryKeyOf(category),
    label: categoryPath(category),
  }));

  const pickCategory = (next: string) => {
    setValue('host_category_key', next, { shouldDirty: true, shouldValidate: true });
    // A club valid for the old category may not match the new one.
    setValue('club_id', '', { shouldDirty: true });
    setValue('venue_id', '', { shouldDirty: true });
    setValue('venue_slot_id', '', { shouldDirty: true });
  };

  if (hostCategories.length === 0) {
    return (
      <YStack gap={6}>
        <Text fontSize={14} fontWeight="500" color="$color">
          Category
        </Text>
        <Text testID="create-pod-category-empty" fontSize={12.5} color="$muted">
          Assigned after host onboarding
        </Text>
      </YStack>
    );
  }

  return (
    <Controller
      control={control}
      name="host_category_key"
      render={({ field, fieldState }) => (
        <ChipSelectField
          label="Your category"
          required
          options={categoryOptions}
          value={field.value}
          onChange={pickCategory}
          error={fieldState.error?.message}
          testID="create-pod-category"
        />
      )}
    />
  );
}
