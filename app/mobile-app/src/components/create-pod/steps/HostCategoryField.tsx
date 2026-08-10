import { Controller } from 'react-hook-form';

import { ChipSelectField } from '../ChipSelectField';
import { hostCategoryKeyOf } from '../create-pod.form';
import { useTranslation } from '@/hooks/useTranslation';
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
  const { t } = useTranslation();
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

  return (
    <Controller
      control={control}
      name="host_category_key"
      render={({ field, fieldState }) => (
        <ChipSelectField
          label={t('mweb.createPod.categoryLabel')}
          hint={t('mweb.createPod.categoryHint')}
          required
          options={categoryOptions}
          // A host with no approved category has nothing to pick, and the
          // schema now blocks the step rather than letting them publish an
          // uncategorised pod.
          emptyHint={t('mweb.createPod.categoryEmpty')}
          value={field.value}
          onChange={pickCategory}
          error={fieldState.error?.message}
          testID="create-pod-category"
        />
      )}
    />
  );
}
