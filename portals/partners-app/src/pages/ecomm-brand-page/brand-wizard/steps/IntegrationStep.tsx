import { Alert, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import type { BrandIntegrations } from '../../queries';
import IntegrationCard from './IntegrationCard';

interface Props {
  brandId: string | null;
  integrations: BrandIntegrations | undefined;
  locked: boolean;
  ensureBrandId: () => Promise<string | null>;
  onChanged: () => void;
}

/** Step 8 — the ShipRocket and Razorpay accounts the brand ships and gets paid through. */
export default function IntegrationStep({ brandId, integrations, locked, ensureBrandId, onChanged }: Readonly<Props>) {
  const { t } = useTranslation();
  const bothConnected = integrations?.shiprocket.connected === true && integrations?.razorpay.connected === true;
  return (
    <Stack spacing={2}>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {t('partners.brandWizard.integration.intro')}
      </Typography>
      {!bothConnected && <Alert severity="warning">{t('partners.brandWizard.integration.bothRequired')}</Alert>}
      <IntegrationCard
        provider="SHIPROCKET"
        status={integrations?.shiprocket}
        brandId={brandId}
        locked={locked}
        ensureBrandId={ensureBrandId}
        onChanged={onChanged}
      />
      <IntegrationCard
        provider="RAZORPAY"
        status={integrations?.razorpay}
        brandId={brandId}
        locked={locked}
        ensureBrandId={ensureBrandId}
        onChanged={onChanged}
      />
    </Stack>
  );
}
