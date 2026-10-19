import { Stack, Typography } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/app-settings';
import ContactSharingNotice from '../../ContactSharingNotice';
import type { GigJobSectionProps } from './gig-job.types';

/** The contact an interested freelancer receives — prefilled from the account, editable per gig. */
export default function GigContactFields({ control }: Readonly<GigJobSectionProps>) {
  const { t } = useTranslation();

  return (
    <Stack spacing={2} component="fieldset" sx={{ border: 0, p: 0, m: 0 }}>
      <Typography component="legend" variant="subtitle1" sx={{ fontWeight: 600 }}>
        {t('gigJobs.form.contactSection')}
      </Typography>
      <RhfTextField control={control} name="contact_name" label={t('gigJobs.form.contactName')} autoComplete="name" />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <RhfTextField
          control={control}
          name="contact_phone"
          label={t('gigJobs.form.contactPhone')}
          type="tel"
          autoComplete="tel"
          data-testid="gig-form-phone"
        />
        <RhfTextField
          control={control}
          name="contact_email"
          label={t('gigJobs.form.contactEmail')}
          type="email"
          autoComplete="email"
        />
      </Stack>
      <ContactSharingNotice />
    </Stack>
  );
}
