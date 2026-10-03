import { useNavigate } from 'react-router';
import { Alert, Chip, Grid, LinearProgress, Stack } from '@mui/material';
import LinkIcon from '@mui/icons-material/Link';
import { DuncitButton } from '@duncit/buttons';
import { formatDate } from '@duncit/app-settings';
import { InfoRow, IntegrationLogo, SectionCard } from '@duncit/ui';
import { useTranslation } from '@duncit/shell';
import type { EcommBrand } from '../queries';
import { integrationReady } from '../brand-wizard/wizard-steps';

type Translate = ReturnType<typeof useTranslation>['t'];

const shippingLabel = (brand: EcommBrand, t: Translate) => {
  if (brand.shipping_mode === 'DUNCIT_COURIER') return t('partners.brandDetails.shippingDuncit');
  if (brand.shipping_mode === 'OWN_SHIPROCKET') return t('partners.brandDetails.shippingOwn');
  return t('partners.brandDetails.shippingNotChosen');
};

/** Where the brand stands on going live, with both providers and the way to finish. */
function GoLiveCard({ brand }: Readonly<{ brand: EcommBrand }>) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const ready = integrationReady(brand.shipping_mode, brand.integrations);
  const shippingOk = brand.shipping_mode === 'DUNCIT_COURIER' || brand.integrations?.shiprocket.connected === true;
  const razorpayOk = brand.integrations?.razorpay.connected === true;
  const chip = (ok: boolean) => (
    <Chip
      size="small"
      color={ok ? 'success' : 'default'}
      variant={ok ? 'filled' : 'outlined'}
      label={ok ? t('partners.brandWizard.integration.connected') : t('partners.brandWizard.integration.notConnected')}
    />
  );
  let banner = <Alert severity="info">{t('partners.brandWizard.integration.bothRequired')}</Alert>;
  if (brand.live) banner = <Alert severity="success">{t('partners.brandWizard.integration.statusLive')}</Alert>;
  else if (ready) banner = <Alert severity="info">{t('partners.brandWizard.integration.statusAwaitingApproval')}</Alert>;
  else if (brand.status === 'APPROVED') banner = <Alert severity="warning">{t('partners.brandWizard.integration.statusPending')}</Alert>;
  return (
    <SectionCard title={t('partners.brandDetails.goLiveTitle')}>
      <Stack spacing={1.5}>
        {banner}
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          <IntegrationLogo vendor="SHIPROCKET" label={t('partners.brandWizard.integration.shiprocketTitle')} size={32} />
          <InfoRow variant="inline" label={t('partners.brandDetails.shipping')} value={shippingLabel(brand, t)} />
          {chip(shippingOk)}
        </Stack>
        <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }}>
          <IntegrationLogo vendor="RAZORPAY" label={t('partners.brandWizard.integration.razorpayTitle')} size={32} />
          <InfoRow variant="inline" label={t('partners.brandWizard.integration.razorpayTitle')} value={brand.integrations?.razorpay.identifier || '—'} />
          {chip(razorpayOk)}
        </Stack>
        {!ready && (
          <DuncitButton
            variant="contained"
            startIcon={<LinkIcon />}
            onClick={() => navigate(`/ecomm-brand/${brand.id}/edit?step=integration`)}
            sx={{ alignSelf: 'flex-start' }}
            data-testid="brand-details-connect"
          >
            {t('partners.ecommBrandPage.connectIntegrations')}
          </DuncitButton>
        )}
      </Stack>
    </SectionCard>
  );
}

/** The brand at a glance: going live, setup progress and the facts on file. */
export default function BrandOverviewTab({ brand }: Readonly<{ brand: EcommBrand }>) {
  const { t } = useTranslation();
  const percent = brand.completion?.percent ?? 0;
  const dash = (value: string | null | undefined) => (value ? formatDate(value) || '—' : '—');
  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, md: 6 }}>
        <GoLiveCard brand={brand} />
      </Grid>
      <Grid size={{ xs: 12, md: 6 }}>
        <SectionCard title={t('partners.brandDetails.completion')}>
          <Stack spacing={1.25}>
            <LinearProgress variant="determinate" value={percent} aria-label={`${percent}%`} sx={{ height: 8, borderRadius: 4 }} />
            <InfoRow variant="inline" label={t('partners.brandDetails.brandId')} value={brand.brand_no || '—'} />
            <InfoRow variant="inline" label={t('partners.brandDetails.submittedAt')} value={dash(brand.submitted_at)} />
            <InfoRow variant="inline" label={t('partners.brandDetails.approvedAt')} value={dash(brand.approved_at)} />
            <InfoRow variant="inline" label={t('partners.brandDetails.liveSince')} value={dash(brand.live_since)} />
            <InfoRow variant="inline" label={t('partners.brandDetails.categories')} value={(brand.product_categories ?? []).join(', ') || '—'} />
            <InfoRow variant="inline" label={t('partners.brandDetails.contact')} value={brand.contact_email || '—'} />
            {brand.reviewer_notes && (
              <InfoRow variant="inline" label={t('partners.brandDetails.reviewerNotes')} value={brand.reviewer_notes} />
            )}
          </Stack>
        </SectionCard>
      </Grid>
    </Grid>
  );
}
