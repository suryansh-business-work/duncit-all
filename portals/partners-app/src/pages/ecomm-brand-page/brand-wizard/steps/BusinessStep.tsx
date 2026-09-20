import { Stack, Typography } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import type { BrandStepProps } from './step-types';

/** Step 2 — the registered entity behind the brand. GSTIN or PAN is required. */
export default function BusinessStep({ control, locked }: Readonly<BrandStepProps>) {
  const { t } = useTranslation();
  return (
    <Stack spacing={2}>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {t('partners.brandWizard.business.intro')}
      </Typography>
      <RhfTextField
        control={control}
        name="registered_business_name"
        label={t('partners.ecommBrandPage.registeredBusinessName')}
        required
        disabled={locked}
        data-testid="brand-wizard-registered-business-name"
      />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <RhfTextField
          control={control}
          name="gstin"
          label="GSTIN"
          disabled={locked}
          hint={t('partners.brandWizard.business.gstinHint')}
          slotProps={{ htmlInput: { style: { textTransform: 'uppercase' }, maxLength: 15 } }}
          data-testid="brand-wizard-gstin"
        />
        <RhfTextField
          control={control}
          name="pan"
          label="PAN"
          disabled={locked}
          hint={t('partners.brandWizard.business.panHint')}
          slotProps={{ htmlInput: { style: { textTransform: 'uppercase' }, maxLength: 10 } }}
          data-testid="brand-wizard-pan"
        />
      </Stack>
      <RhfTextField
        control={control}
        name="established_year"
        label={t('partners.ecommBrandPage.establishedYear')}
        disabled={locked}
        hint={t('partners.brandWizard.business.establishedYearHint')}
        slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: 4 } }}
        sx={{ maxWidth: 240 }}
        data-testid="brand-wizard-established-year"
      />
    </Stack>
  );
}
