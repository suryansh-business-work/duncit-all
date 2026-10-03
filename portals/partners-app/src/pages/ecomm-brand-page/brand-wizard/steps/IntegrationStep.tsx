import { Alert, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import type { BrandIntegrations, BrandShippingMode, EcommBrand } from '../../queries';
import { integrationReady } from '../wizard-steps';
import IntegrationCard from './IntegrationCard';
import ShippingModeChooser from './ShippingModeChooser';

/** The brand facts the live banner reads. */
type LiveFacts = Pick<EcommBrand, 'status' | 'live' | 'integration_waived'>;

interface Props {
  brandId: string | null;
  shippingMode: BrandShippingMode | null | undefined;
  integrations: BrandIntegrations | undefined;
  /** Null for a brand not saved yet. */
  brand: LiveFacts | null;
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
 * The LAST step — who ships the brand's parcels, and the Razorpay account it
 * gets paid through. Not needed to submit; the approved brand goes live once
 * both are settled, so it stays editable while the brand is in review or live.
 */
export default function IntegrationStep({
  brandId,
  shippingMode,
  integrations,
  brand,
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
      <LiveBanner brand={brand} ready={integrationReady(shippingMode, integrations)} />
      <ShippingModeChooser mode={mode} locked={locked} ensureBrandId={ensureBrandId} onChanged={onChanged} />
      {mode === 'OWN_SHIPROCKET' && <IntegrationCard provider="SHIPROCKET" status={integrations?.shiprocket} {...shared} />}
      <IntegrationCard provider="RAZORPAY" status={integrations?.razorpay} {...shared} />
    </Stack>
  );
}
