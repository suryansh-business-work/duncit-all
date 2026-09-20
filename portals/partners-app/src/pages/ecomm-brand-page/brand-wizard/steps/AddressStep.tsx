import { Stack, Typography } from '@mui/material';
import { RhfTextField } from '@duncit/forms';
import { useTranslation } from '@duncit/shell';
import type { BrandStepProps } from './step-types';

/** Step 3 — the registered business address. Warehouses live under Brand settings. */
export default function AddressStep({ control, locked }: Readonly<BrandStepProps>) {
  const { t } = useTranslation();
  return (
    <Stack spacing={2}>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {t('partners.brandWizard.address.intro')}
      </Typography>
      <RhfTextField
        control={control}
        name="address_line1"
        label={t('partners.common.addressLine1')}
        required
        disabled={locked}
        data-testid="brand-wizard-address-line1"
      />
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <RhfTextField
          control={control}
          name="city"
          label={t('partners.common.city')}
          required
          disabled={locked}
          data-testid="brand-wizard-city"
        />
        <RhfTextField
          control={control}
          name="state"
          label={t('partners.ecommBrandPage.state')}
          required
          disabled={locked}
          data-testid="brand-wizard-state"
        />
      </Stack>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
        <RhfTextField
          control={control}
          name="postal_code"
          label={t('partners.ecommBrandPage.postalCode')}
          required
          disabled={locked}
          hint={t('partners.brandWizard.address.postalCodeHint')}
          slotProps={{ htmlInput: { inputMode: 'numeric' } }}
          data-testid="brand-wizard-postal-code"
        />
        <RhfTextField
          control={control}
          name="country"
          label={t('partners.ecommBrandPage.country')}
          disabled={locked}
          data-testid="brand-wizard-country"
        />
      </Stack>
    </Stack>
  );
}
