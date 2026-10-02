import { Alert, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import type { BrandIntegrations, BrandShippingMode } from '../../queries';
import { integrationReady } from '../wizard-steps';
import IntegrationCard from './IntegrationCard';
import ShippingModeChooser from './ShippingModeChooser';

interface Props {
  brandId: string | null;
  shippingMode: BrandShippingMode | null | undefined;
  integrations: BrandIntegrations | undefined;
  locked: boolean;
  ensureBrandId: () => Promise<string | null>;
  onChanged: () => void;
}

/**
 * The mode the chooser shows. A brand from before the choice that saved its
 * own ShipRocket already ships on it; one that has done neither has not chosen.
 */
const shownMode = (mode: BrandShippingMode | null | undefined, integrations: BrandIntegrations | undefined) => {
  if (mode) return mode;
  return integrations?.shiprocket.configured ? 'OWN_SHIPROCKET' : null;
};

/** Step 8 — who ships the brand's parcels, and the Razorpay account it gets paid through. */
export default function IntegrationStep({
  brandId,
  shippingMode,
  integrations,
  locked,
  ensureBrandId,
  onChanged,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const mode = shownMode(shippingMode, integrations);
  const shared = { brandId, locked, ensureBrandId, onChanged };
  return (
    <Stack spacing={2}>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {t('partners.brandWizard.integration.intro')}
      </Typography>
      {!integrationReady(shippingMode, integrations) && (
        <Alert severity="warning">{t('partners.brandWizard.integration.bothRequired')}</Alert>
      )}
      <ShippingModeChooser mode={mode} locked={locked} ensureBrandId={ensureBrandId} onChanged={onChanged} />
      {mode === 'OWN_SHIPROCKET' && <IntegrationCard provider="SHIPROCKET" status={integrations?.shiprocket} {...shared} />}
      <IntegrationCard provider="RAZORPAY" status={integrations?.razorpay} {...shared} />
    </Stack>
  );
}
