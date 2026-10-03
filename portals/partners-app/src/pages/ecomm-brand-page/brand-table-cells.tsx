import { Avatar, Box, Chip, LinearProgress, Stack, Tooltip, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import type { EcommBrand, EcommBrandRow } from './queries';

const STATUS_COLOR: Record<string, 'default' | 'info' | 'success' | 'warning' | 'error'> = {
  DRAFT: 'warning',
  SUBMITTED: 'info',
  APPROVED: 'success',
  REJECTED: 'error',
};

export const percentOf = (brand: EcommBrandRow) => brand.completion?.percent ?? 0;

/** A brand on the Duncit courier needs no ShipRocket account — its shipping is settled. */
const shippingSettled = (brand: EcommBrandRow) =>
  brand.shipping_mode === 'DUNCIT_COURIER' || brand.integrations?.shiprocket?.connected === true;

/** How many of the two go-live integrations are settled (shipping, Razorpay). */
export const connectedCount = (brand: EcommBrandRow) =>
  [shippingSettled(brand), brand.integrations?.razorpay?.connected === true].filter(Boolean).length;

/** Logo + name + tagline. */
export function BrandCell({ brand }: Readonly<{ brand: EcommBrandRow }>) {
  const { t } = useTranslation();
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
      <Avatar src={brand.logo_url || undefined} alt="" variant="rounded" sx={{ width: 32, height: 32 }}>
        {(brand.brand_name || '?').charAt(0).toUpperCase()}
      </Avatar>
      <Box sx={{ minWidth: 0, lineHeight: 1.2 }}>
        <Typography variant="body2" noWrap component="div" sx={{ fontWeight: 700 }}>
          {brand.brand_name || t('partners.ecommBrandPage.untitledBrand')}
        </Typography>
        <Typography variant="caption" noWrap component="div" sx={{ color: 'text.secondary' }}>
          {brand.tagline || '—'}
        </Typography>
      </Box>
    </Stack>
  );
}

/** The wizard's completion percentage as a bar. */
export function ProgressCell({ brand }: Readonly<{ brand: EcommBrandRow }>) {
  const percent = percentOf(brand);
  return (
    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', width: '100%' }}>
      <LinearProgress variant="determinate" value={percent} aria-label={`${percent}%`} sx={{ flex: 1, height: 6, borderRadius: 3 }} />
      <Typography variant="caption" sx={{ fontWeight: 700, minWidth: 36, textAlign: 'right' }}>
        {percent}%
      </Typography>
    </Stack>
  );
}

/** SR / RZP chips coloured by whether the brand's own account connects. */
export function IntegrationsCell({ brand }: Readonly<{ brand: EcommBrandRow }>) {
  const { t } = useTranslation();
  const chip = (label: string, connected: boolean | undefined) => (
    <Tooltip title={connected ? t('partners.ecommBrandPage.integrationConnected') : t('partners.ecommBrandPage.integrationPending')}>
      <Chip size="small" label={label} color={connected ? 'success' : 'default'} variant={connected ? 'filled' : 'outlined'} />
    </Tooltip>
  );
  return (
    <Stack direction="row" spacing={0.5} component="span">
      {brand.shipping_mode === 'DUNCIT_COURIER'
        ? chip(t('partners.ecommBrandPage.duncitCourierShort'), true)
        : chip(t('partners.ecommBrandPage.shiprocketShort'), brand.integrations?.shiprocket?.connected)}
      {chip(t('partners.ecommBrandPage.razorpayShort'), brand.integrations?.razorpay?.connected)}
    </Stack>
  );
}

/** Status chip, plus Live / Integration pending on an approved brand, or Paused when the partner hid it. */
export function StatusCell({ brand }: Readonly<{ brand: Pick<EcommBrand, 'status' | 'is_active' | 'live'> }>) {
  const { t } = useTranslation();
  return (
    <Stack direction="row" spacing={0.5} component="span">
      <Chip size="small" color={STATUS_COLOR[brand.status]} label={brand.status} />
      {brand.status === 'APPROVED' && brand.is_active === false && (
        <Chip size="small" color="warning" variant="outlined" label={t('partners.ecommBrandPage.paused')} />
      )}
      {brand.status === 'APPROVED' && brand.is_active !== false && <LiveChip live={brand.live} />}
    </Stack>
  );
}

/** Whether an approved, active brand is actually selling — the go-live gate made visible. */
export function LiveChip({ live }: Readonly<{ live: boolean }>) {
  const { t } = useTranslation();
  return (
    <Tooltip title={live ? t('partners.ecommBrandPage.liveHint') : t('partners.ecommBrandPage.integrationPendingHint')}>
      <Chip
        size="small"
        variant="outlined"
        color={live ? 'success' : 'warning'}
        label={live ? t('partners.ecommBrandPage.live') : t('partners.ecommBrandPage.integrationPendingChip')}
        data-testid="brand-live-chip"
      />
    </Tooltip>
  );
}
