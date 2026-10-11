import { useQuery } from '@apollo/client/react';
import { Alert, Stack, Typography } from '@mui/material';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/shell';
import type { BrandIntegrations, BrandShippingMode, EcommBrand } from '../../queries';
import { MY_PARTNER_INTEGRATIONS } from '../../integrations/integrations.queries';
import { integrationReady } from '../wizard-steps';
import IntegrationPicker from './IntegrationPicker';

/** The brand facts the live banner reads. */
type LiveFacts = Pick<EcommBrand, 'status' | 'live' | 'integration_waived'>;

interface Props {
  shippingMode: BrandShippingMode | null | undefined;
  integrations: BrandIntegrations | undefined;
  /** Null for a brand not saved yet. */
  brand: LiveFacts | null;
  locked: boolean;
  ensureBrandId: () => Promise<string | null>;
  onChanged: () => void;
}

/** Where the brand stands on going live — the reason this step exists. */
function LiveBanner({ brand, ready }: Readonly<{ brand: LiveFacts | null; ready: boolean }>) {
  const { t } = useTranslation();
  if (brand?.live && brand.integration_waived && !ready) {
    return <Alert severity="info">{t('partners.brandWizard.integration.statusWaived')}</Alert>;
  }
  if (brand?.live) return <Alert severity="success">{t('partners.brandWizard.integration.statusLive')}</Alert>;
  if (ready) return <Alert severity="info">{t('partners.brandWizard.integration.statusAwaitingApproval')}</Alert>;
  if (brand?.status === 'APPROVED') {
    return <Alert severity="warning">{t('partners.brandWizard.integration.statusPending')}</Alert>;
  }
  return <Alert severity="info">{t('partners.brandWizard.integration.bothRequired')}</Alert>;
}

/**
 * The LAST step — the ShipRocket account that ships the brand's parcels and the
 * Razorpay account it gets paid through, each PICKED from the partner's saved
 * Integrations. Not needed to submit; the approved brand goes live once both
 * are connected, so it stays editable while the brand is in review or live.
 *
 * Every brand ships on its own ShipRocket account. A brand that chose the
 * Duncit courier while it was offered is told so, and moves by picking one.
 */
export default function IntegrationStep({ shippingMode, integrations, brand, locked, ensureBrandId, onChanged }: Readonly<Props>) {
  const { t } = useTranslation();
  const { data, error } = useQuery(MY_PARTNER_INTEGRATIONS, { fetchPolicy: 'cache-and-network' });
  // Undefined until the first answer, so a picker never reads "none saved" while loading.
  const saved = data?.myPartnerIntegrations;
  const shared = { locked, ensureBrandId, onChanged };
  return (
    <Stack spacing={2}>
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {t('partners.brandWizard.integration.intro')}
      </Typography>
      <LiveBanner brand={brand} ready={integrationReady(shippingMode, integrations)} />
      {shippingMode === 'DUNCIT_COURIER' && (
        <Alert severity="warning" data-testid="brand-shipping-legacy-courier">
          {t('partners.brandWizard.integration.legacyCourier')}
        </Alert>
      )}
      {error && !data && (
        <Alert severity="error">
          {t('partners.integrations.loadFailed')} {parseApiError(error)}
        </Alert>
      )}
      <IntegrationPicker
        provider="SHIPROCKET"
        status={integrations?.shiprocket}
        connections={saved?.filter((c) => c.provider === 'SHIPROCKET')}
        {...shared}
      />
      <IntegrationPicker
        provider="RAZORPAY"
        status={integrations?.razorpay}
        connections={saved?.filter((c) => c.provider === 'RAZORPAY')}
        {...shared}
      />
    </Stack>
  );
}
