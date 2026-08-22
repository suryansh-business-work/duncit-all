import { Divider, Stack } from '@mui/material';
import { useFormContext, useFormState } from 'react-hook-form';
import BulletListField from '../components/BulletListField';
import FaqListField from '../components/FaqListField';
import type { ClubFormValues } from '../types';
import { useTranslation } from '../i18n/useTranslation';

/** Club Detail page content authored by admins (bullets + FAQs). */
export default function ContentSection() {
  const { t } = useTranslation();
  const { control } = useFormContext<ClubFormValues>();
  const { errors } = useFormState({ control });

  return (
    <Stack spacing={2.5}>
      <BulletListField
        name="who_we_are"
        label={t('clubForm.contentSection.whoWeAre')}
        required
        helperText="Short intro lines about the club's identity — add at least one."
        error={errors.who_we_are?.message}
      />
      <Divider />
      <BulletListField
        name="what_we_do"
        label={t('clubForm.contentSection.whatWeDo')}
        required
        helperText={t('clubForm.contentSection.theActivitiesExperiencesTheClubRuns')}
        error={errors.what_we_do?.message}
      />
      <Divider />
      <BulletListField
        name="perks"
        label={t('clubForm.common.perks')}
        required
        helperText={t('clubForm.contentSection.benefitsMembersGetAddAtLeast')}
        error={errors.perks?.message}
      />
      <Divider />
      <BulletListField
        name="values"
        label={t('clubForm.contentSection.values')}
        required
        helperText={t('clubForm.contentSection.whatTheClubStandsForAdd')}
        error={errors.values?.message}
      />
      <Divider />
      <FaqListField />
    </Stack>
  );
}
