import { Controller, useWatch, type UseFormGetValues, type UseFormSetValue } from 'react-hook-form';
import { MenuItem, TextField } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/app-settings';
import {
  gigPosterRoleKey,
  gigRoleOptions,
  prunedGigRoles,
  type GigCategory,
  type GigJobFormValues,
  type GigPosterRole,
} from '@duncit/utils';
import ChipMultiSelect from '../ChipMultiSelect';
import type { GigJobSectionProps } from './gig-job.types';

interface Props extends GigJobSectionProps {
  categories: readonly GigCategory[];
  posterRoles: readonly GigPosterRole[];
  getValues: UseFormGetValues<GigJobFormValues>;
  setValue: UseFormSetValue<GigJobFormValues>;
}

/** Who is posting, the category, the roles needed, and the title + details. */
export default function GigWhatFields({ control, categories, posterRoles, getValues, setValue }: Readonly<Props>) {
  const { t } = useTranslation();
  const categoryId = useWatch({ control, name: 'category_id' });

  // Changing category drops the roles it does not offer — said here, not in an
  // effect, so the form never renders a role the category cannot have.
  const pickCategory = (id: string) => {
    const kept = prunedGigRoles(categories, id, getValues('roles'));
    if (kept) setValue('roles', kept, { shouldValidate: true });
  };

  return (
    <>
      <RhfTextField control={control} name="poster_role" label={t('gigJobs.form.postingAs')} select data-testid="gig-form-role">
        {posterRoles.map((role) => (
          <MenuItem key={role} value={role}>
            {t(gigPosterRoleKey(role))}
          </MenuItem>
        ))}
      </RhfTextField>
      <Controller
        control={control}
        name="category_id"
        render={({ field: { ref, onChange, ...field }, fieldState }) => (
          <TextField
            {...field}
            select
            fullWidth
            inputRef={ref}
            label={t('gigJobs.form.category')}
            onChange={(event) => {
              onChange(event.target.value);
              pickCategory(event.target.value);
            }}
            error={!!fieldState.error}
            helperText={fieldState.error?.message ?? ' '}
            data-testid="gig-form-category"
          >
            {categories.map((category) => (
              <MenuItem key={category.id} value={category.id}>
                {category.title}
              </MenuItem>
            ))}
          </TextField>
        )}
      />
      <ChipMultiSelect
        control={control}
        name="roles"
        label={t('gigJobs.form.roles')}
        options={gigRoleOptions(categories, categoryId)}
        hint={categoryId ? t('gigJobs.form.rolesHint') : t('gigJobs.form.pickCategoryFirst')}
        disabled={!categoryId}
        testId="gig-form-roles"
      />
      <RhfTextField
        control={control}
        name="title"
        label={t('gigJobs.form.title')}
        placeholder={t('gigJobs.form.titlePlaceholder')}
        data-testid="gig-form-title"
      />
      <RhfTextField
        control={control}
        name="description"
        label={t('gigJobs.form.description')}
        placeholder={t('gigJobs.form.descriptionPlaceholder')}
        multiline
        minRows={3}
      />
    </>
  );
}
