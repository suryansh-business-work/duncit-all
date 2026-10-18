import {
  Controller,
  useWatch,
  type Control,
  type UseFormGetValues,
  type UseFormSetValue,
} from 'react-hook-form';
import {
  gigPosterRoleKey,
  gigRoleOptions,
  prunedGigRoles,
  type GigCategory,
  type GigJobFormValues,
  type GigPosterRole,
} from '@duncit/utils';

import { ChipSelectField } from '@/components/create-pod/ChipSelectField';
import { FormTextField } from '@/components/FormTextField';
import { useTranslation } from '@/hooks/useTranslation';
import { MultiChipField } from '../MultiChipField';

interface Props {
  control: Control<GigJobFormValues>;
  getValues: UseFormGetValues<GigJobFormValues>;
  setValue: UseFormSetValue<GigJobFormValues>;
  categories: readonly GigCategory[];
  posterRoles: readonly GigPosterRole[];
}

/** Who is posting, the category, the roles needed, the title and details. mWeb twin: GigWhatFields. */
export function GigWhatFields({
  control,
  getValues,
  setValue,
  categories,
  posterRoles,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const categoryId = useWatch({ control, name: 'category_id' });
  const options = gigRoleOptions(categories, categoryId);

  // Picking another category drops the roles it does not offer, as it is picked.
  const pickCategory = (id: string, apply: (id: string) => void) => {
    apply(id);
    const kept = prunedGigRoles(categories, id, getValues('roles'));
    if (kept) setValue('roles', kept, { shouldValidate: true });
  };

  return (
    <>
      <Controller
        control={control}
        name="poster_role"
        render={({ field, fieldState }) => (
          <ChipSelectField
            testID="gig-form-role"
            label={t('gigJobs.form.postingAs')}
            options={posterRoles.map((role) => ({ value: role, label: t(gigPosterRoleKey(role)) }))}
            value={field.value}
            onChange={field.onChange}
            error={fieldState.error?.message}
            required
          />
        )}
      />
      <Controller
        control={control}
        name="category_id"
        render={({ field, fieldState }) => (
          <ChipSelectField
            testID="gig-form-category"
            label={t('gigJobs.form.category')}
            options={categories.map((category) => ({ value: category.id, label: category.title }))}
            value={field.value}
            onChange={(next) => pickCategory(next, field.onChange)}
            error={fieldState.error?.message}
            required
          />
        )}
      />
      <Controller
        control={control}
        name="roles"
        render={({ field, fieldState }) => (
          <MultiChipField
            testID="gig-form-roles"
            label={t('gigJobs.form.roles')}
            hint={categoryId ? t('gigJobs.form.rolesHint') : t('gigJobs.form.pickCategoryFirst')}
            options={options.map((role) => ({ value: role, label: role }))}
            value={field.value}
            onChange={field.onChange}
            error={fieldState.error?.message}
            required
          />
        )}
      />
      <FormTextField
        control={control}
        name="title"
        label={t('gigJobs.form.title')}
        placeholder={t('gigJobs.form.titlePlaceholder')}
        required
      />
      <FormTextField
        control={control}
        name="description"
        label={t('gigJobs.form.description')}
        placeholder={t('gigJobs.form.descriptionPlaceholder')}
        multiline
      />
    </>
  );
}
