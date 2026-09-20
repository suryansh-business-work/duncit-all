import { Stack, Typography } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import type { BrandStepProps } from './step-types';

/** Step 1 — how shoppers see the brand, and who Duncit writes to about it. */
export default function DetailsStep({ control, locked }: Readonly<BrandStepProps>) {
  const { t } = useTranslation();
  return (
    <Stack spacing={2}>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {t('partners.brandWizard.details.intro')}
      </Typography>
      <RhfTextField
        control={control}
        name="brand_name"
        label={t('partners.ecommBrandPage.brandName')}
        required
        disabled={locked}
        hint={t('partners.brandWizard.details.brandNameHint')}
        data-testid="brand-wizard-brand-name"
      />
      <RhfTextField
        control={control}
        name="tagline"
        label={t('partners.ecommBrandPage.tagline')}
        disabled={locked}
        hint={t('partners.brandWizard.details.taglineHint')}
        data-testid="brand-wizard-tagline"
      />
      <RhfTextField
        control={control}
        name="description"
        label={t('shell.common.description')}
        required
        multiline
        minRows={3}
        disabled={locked}
        hint={t('partners.brandWizard.details.descriptionHint')}
        data-testid="brand-wizard-description"
      />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <RhfTextField
          control={control}
          name="website_url"
          label={t('partners.ecommBrandPage.website')}
          disabled={locked}
          data-testid="brand-wizard-website"
        />
        <RhfTextField
          control={control}
          name="instagram_url"
          label={t('partners.ecommBrandPage.instagram')}
          disabled={locked}
          data-testid="brand-wizard-instagram"
        />
      </Stack>
      <Typography variant="subtitle2" component="h3" sx={{ fontWeight: 800 }}>
        {t('partners.ecommBrandPage.contact')}
      </Typography>
      <RhfTextField
        control={control}
        name="contact_person"
        label={t('partners.ecommBrandPage.contactPerson')}
        disabled={locked}
        data-testid="brand-wizard-contact-person"
      />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <RhfTextField
          control={control}
          name="contact_email"
          label={t('partners.ecommBrandPage.contactEmail')}
          type="email"
          required
          disabled={locked}
          hint={t('partners.brandWizard.details.contactEmailHint')}
          data-testid="brand-wizard-contact-email"
        />
        <RhfTextField
          control={control}
          name="contact_phone"
          label={t('partners.ecommBrandPage.contactPhone')}
          type="tel"
          disabled={locked}
          hint={t('partners.brandWizard.details.contactPhoneHint')}
          data-testid="brand-wizard-contact-phone"
        />
      </Stack>
    </Stack>
  );
}
