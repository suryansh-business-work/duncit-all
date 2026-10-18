import { useMemo } from 'react';
import { Controller, useForm, useWatch, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Alert, FormControlLabel, Stack, Switch } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import { makeFreelancerProfileSchema } from '@duncit/forms/schemas';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/app-settings';
import { freelancerSkillOptions, type FreelancerFormValues } from '@duncit/utils';
import ChipMultiSelect from '../../form/ChipMultiSelect';
import ContactSharingNotice from '../../ContactSharingNotice';
import type { FreelancerProfileFormProps } from './freelancer-profile.types';

/** What a freelancer does, where, and how posters reach them. */
export default function FreelancerProfileForm({
  initialValues,
  categories,
  joined,
  busy,
  errorMessage,
  onSubmit,
}: Readonly<FreelancerProfileFormProps>) {
  const { t } = useTranslation();
  const schema = useMemo(() => makeFreelancerProfileSchema(t), [t]);
  const { control, handleSubmit } = useForm<FreelancerFormValues>({
    defaultValues: initialValues,
    resolver: zodResolver(schema) as unknown as Resolver<FreelancerFormValues>,
    mode: 'onBlur',
  });
  const categoryIds = useWatch({ control, name: 'category_ids' });
  const titles = useMemo(() => new Map(categories.map((category) => [category.id, category.title])), [categories]);

  return (
    <form noValidate onSubmit={handleSubmit(onSubmit)} data-testid="freelancer-form">
      <Stack spacing={2.5}>
        {errorMessage && <Alert severity="error">{errorMessage}</Alert>}
        <RhfTextField control={control} name="display_name" label={t('gigJobs.freelancer.name')} autoComplete="name" />
        <ChipMultiSelect
          control={control}
          name="category_ids"
          label={t('gigJobs.freelancer.categories')}
          options={categories.map((category) => category.id)}
          optionLabel={(id) => titles.get(id) ?? id}
          testId="freelancer-categories"
        />
        <ChipMultiSelect
          control={control}
          name="skills"
          label={t('gigJobs.freelancer.skills')}
          options={freelancerSkillOptions(categories, categoryIds)}
          hint={t('gigJobs.freelancer.skillsHint')}
          disabled={categoryIds.length === 0}
          testId="freelancer-skills"
        />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <RhfTextField control={control} name="city" label={t('gigJobs.freelancer.city')} />
          <RhfTextField
            control={control}
            name="experience_years"
            label={t('gigJobs.freelancer.experience')}
            slotProps={{ htmlInput: { inputMode: 'numeric' } }}
          />
        </Stack>
        <RhfTextField control={control} name="bio" label={t('gigJobs.freelancer.bio')} multiline minRows={3} />
        <RhfTextField control={control} name="portfolio_url" label={t('gigJobs.freelancer.portfolio')} type="url" />
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <RhfTextField control={control} name="contact_phone" label={t('gigJobs.freelancer.phone')} type="tel" autoComplete="tel" />
          <RhfTextField control={control} name="contact_email" label={t('gigJobs.freelancer.email')} type="email" autoComplete="email" />
        </Stack>
        <Controller
          control={control}
          name="is_available"
          render={({ field }) => (
            <FormControlLabel
              control={<Switch checked={field.value} onChange={(event) => field.onChange(event.target.checked)} />}
              label={t('gigJobs.freelancer.available')}
            />
          )}
        />
        <ContactSharingNotice />
        <DuncitButton type="submit" variant="contained" loading={busy} disabled={busy} data-testid="freelancer-submit">
          {joined ? t('gigJobs.freelancer.save') : t('gigJobs.freelancer.join')}
        </DuncitButton>
      </Stack>
    </form>
  );
}
