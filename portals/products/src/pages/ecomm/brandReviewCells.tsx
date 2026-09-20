import { Avatar, Chip, LinearProgress, Stack, Typography } from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutlined';
import { StatusChip } from '@duncit/ui';
import type { useTranslation } from '@duncit/shell';
import { BRAND_STATUS_COLOR } from './brandStatus';
import type { BrandIntegrationStatus, EcommBrandRow } from './queries';

export type Translate = ReturnType<typeof useTranslation>['t'];

const DASH = '—';

/** The cell renderers of the brands review table, hoisted so the table stays
 * a column list (rule 9) and the same cells can be read on the detail page. */
export const renderLogo = (b: EcommBrandRow) => (
  <Avatar alt="" src={b.logo_url || undefined} variant="rounded" sx={{ width: 32, height: 32 }}>
    {b.brand_name?.[0]?.toUpperCase() ?? '?'}
  </Avatar>
);

export const renderBrand = (b: EcommBrandRow) => (
  <Stack sx={{ lineHeight: 1.2 }} component="span">
    <Typography variant="body2" component="span" sx={{ fontWeight: 600 }}>
      {b.brand_name}
    </Typography>
    <Typography variant="caption" component="span" sx={{ color: 'text.secondary' }}>
      {b.contact_email || b.contact_phone || DASH}
    </Typography>
  </Stack>
);

export const locationValue = (b: EcommBrandRow) =>
  [b.city, b.state].filter(Boolean).join(', ') || DASH;

export const renderPickup = (b: EcommBrandRow, t: Translate) =>
  b.default_pickup_location_id ? (
    <Chip size="small" color="success" variant="outlined" icon={<CheckCircleIcon />} label={t('products.pickup.registered')} />
  ) : (
    <Chip size="small" color="warning" variant="outlined" icon={<ErrorOutlineIcon />} label={t('products.pickup.noDefault')} />
  );

export const pickupValue = (b: EcommBrandRow, t: Translate) =>
  b.default_pickup_location_id ? t('products.pickup.registered') : t('products.pickup.noDefault');

export const renderStatus = (b: EcommBrandRow) => (
  <StatusChip status={b.status} colorMap={BRAND_STATUS_COLOR} />
);

export const completionValue = (b: EcommBrandRow) => b.completion.percent;

/** A bar plus the number: the bar is what the eye scans, the number is what a
 * screen reader gets (the progressbar role carries aria-valuenow). */
export const renderCompletion = (b: EcommBrandRow, t: Translate) => (
  <Stack direction="row" spacing={1} sx={{ alignItems: 'center', width: '100%' }}>
    <LinearProgress
      variant="determinate"
      value={b.completion.percent}
      aria-label={t('products.brandReview.colCompletion')}
      sx={{ flex: 1, height: 6, borderRadius: 3 }}
    />
    <Typography variant="caption" component="span" sx={{ minWidth: 36, textAlign: 'right' }}>
      {b.completion.percent}%
    </Typography>
  </Stack>
);

/** Connected reads as colour AND icon (WCAG 1.4.1); the title names the provider. */
const integrationChip = (status: BrandIntegrationStatus, label: string, title: string) => (
  <Chip
    size="small"
    variant="outlined"
    color={status.connected ? 'success' : 'default'}
    icon={status.connected ? <CheckCircleIcon /> : <ErrorOutlineIcon />}
    label={label}
    title={title}
  />
);

export const renderIntegrations = (b: EcommBrandRow, t: Translate) => (
  <Stack direction="row" spacing={0.5} component="span">
    {integrationChip(b.integrations.shiprocket, t('products.brandReview.shiprocketShort'), t('products.brandReview.shiprocket'))}
    {integrationChip(b.integrations.razorpay, t('products.brandReview.razorpayShort'), t('products.brandReview.razorpay'))}
  </Stack>
);

export const integrationsValue = (b: EcommBrandRow, t: Translate) =>
  [
    b.integrations.shiprocket.connected && t('products.brandReview.shiprocket'),
    b.integrations.razorpay.connected && t('products.brandReview.razorpay'),
  ]
    .filter(Boolean)
    .join(', ') || t('products.brandReview.notConnected');
