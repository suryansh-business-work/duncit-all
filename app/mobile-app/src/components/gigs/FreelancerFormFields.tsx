import { Controller, useWatch, type Control } from 'react-hook-form';
import { freelancerSkillOptions, type FreelancerFormValues, type GigCategory } from '@duncit/utils';

import { FormTextField } from '@/components/FormTextField';
import { ToggleRow } from '@/components/ToggleRow';
import { useTranslation } from '@/hooks/useTranslation';
import { MultiChipField } from './MultiChipField';

interface Props {
  control: Control<FreelancerFormValues>;
  categories: readonly GigCategory[];
}

/** What a freelancer does, where, and how posters reach them. mWeb twin: freelancer-profile.form. */
export function FreelancerFormFields({ control, categories }: Readonly<Props>) {
  const { t } = useTranslation();
  const categoryIds = useWatch({ control, name: 'category_ids' });
  const skills = freelancerSkillOptions(categories, categoryIds);

  return (
    <>
      <FormTextField
        control={control}
        name="display_name"
        label={t('gigJobs.freelancer.name')}
        autoComplete="name"
        required
      />
      <Controller
        control={control}
        name="category_ids"
        render={({ field, fieldState }) => (
          <MultiChipField
            testID="freelancer-categories"
            label={t('gigJobs.freelancer.categories')}
            options={categories.map((category) => ({ value: category.id, label: category.title }))}
            value={field.value}
            onChange={field.onChange}
            error={fieldState.error?.message}
            required
          />
        )}
      />
      <Controller
        control={control}
        name="skills"
        render={({ field, fieldState }) => (
          <MultiChipField
            testID="freelancer-skills"
            label={t('gigJobs.freelancer.skills')}
            hint={t('gigJobs.freelancer.skillsHint')}
            options={skills.map((skill) => ({ value: skill, label: skill }))}
            value={field.value}
            onChange={field.onChange}
            error={fieldState.error?.message}
            required
          />
        )}
      />
      <FormTextField control={control} name="city" label={t('gigJobs.freelancer.city')} required />
      <FormTextField
        control={control}
        name="experience_years"
        label={t('gigJobs.freelancer.experience')}
        keyboardType="number-pad"
      />
      <FormTextField control={control} name="bio" label={t('gigJobs.freelancer.bio')} multiline />
      <FormTextField
        control={control}
        name="portfolio_url"
        label={t('gigJobs.freelancer.portfolio')}
        keyboardType="url"
        autoCapitalize="none"
      />
      <FormTextField
        control={control}
        name="contact_phone"
        label={t('gigJobs.freelancer.phone')}
        keyboardType="phone-pad"
        autoComplete="tel"
        required
      />
      <FormTextField
        control={control}
        name="contact_email"
        label={t('gigJobs.freelancer.email')}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
      />
      <Controller
        control={control}
        name="is_available"
        render={({ field }) => (
          <ToggleRow
            testID="freelancer-available"
            label={t('gigJobs.freelancer.available')}
            value={field.value}
            onChange={field.onChange}
          />
        )}
      />
    </>
  );
}
