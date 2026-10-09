import { Alert, Box, Divider, MenuItem, Skeleton, Stack, TextField, Typography } from '@mui/material';
import WarehouseRoundedIcon from '@mui/icons-material/WarehouseRounded';
import SyncRoundedIcon from '@mui/icons-material/SyncRounded';
import OpenInNewRoundedIcon from '@mui/icons-material/OpenInNewRounded';
import { DuncitButton } from '@duncit/buttons';
import { parseApiError } from '@duncit/utils';
import StudioPageHeader from '../../components/StudioPageHeader';
import { SURFACE_SX } from '../../theme';
import { useTranslation } from '../../i18n/useTranslation';
import { openPartnerPortal } from '../studio-options/openPartnerPortal';
import { useBrandWarehouses } from './useBrandWarehouses';
import WarehouseRow from './WarehouseRow';
import type { BrandPickupSync } from './queries';

/** The Partner console's warehouse desk, where warehouses are added and edited. */
const MANAGE_PATH = '/ecomm-brand/warehouses';

/** Said once a sync is back: what ShipRocket answered, and what it brought in. */
function SyncOutcome({ result }: Readonly<{ result: BrandPickupSync }>) {
  const { t } = useTranslation();
  if (result.shiprocket_error) {
    return (
      <Alert severity="error" data-testid="brand-warehouses-sync-error">
        {t('mweb.brandWarehouses.syncFailed', { vars: { error: result.shiprocket_error } })}
      </Alert>
    );
  }
  return (
    <Alert severity="success" data-testid="brand-warehouses-synced">
      {t('mweb.brandWarehouses.synced')}
      {result.adopted > 0 && ` ${t('mweb.brandWarehouses.adopted', { count: result.adopted, vars: { count: result.adopted } })}`}
    </Alert>
  );
}

/**
 * Brand Studio → ShipRocket Warehouses (/products/warehouses): a brand's pickup
 * addresses with their review and ShipRocket standing, and a sync that checks
 * them against ShipRocket (taking in pickups the brand's own account has).
 * Adding and editing stay in the Partner app. Native twin: BrandWarehousesScreen.
 */
export default function BrandWarehousesPage() {
  const { t } = useTranslation();
  const desk = useBrandWarehouses();
  const failure = desk.brandsError ?? desk.error;

  let body;
  if (desk.brandsLoading || desk.loading) {
    body = <Skeleton variant="rounded" height={160} data-testid="brand-warehouses-loading" />;
  } else if (failure && desk.warehouses.length === 0) {
    body = (
      <Alert
        severity="error"
        data-testid="brand-warehouses-error"
        action={
          <DuncitButton color="inherit" size="small" onClick={desk.retry} data-testid="brand-warehouses-retry">
            {t('mweb.brandWarehouses.retry')}
          </DuncitButton>
        }
      >
        {parseApiError(failure, t('mweb.brandWarehouses.loadFailed'))}
      </Alert>
    );
  } else if (!desk.brandId) {
    body = <Alert severity="info" data-testid="brand-warehouses-no-brands">{t('mweb.brandWarehouses.noBrands')}</Alert>;
  } else if (desk.warehouses.length === 0) {
    body = <Alert severity="info" data-testid="brand-warehouses-empty">{t('mweb.brandWarehouses.empty')}</Alert>;
  } else {
    body = (
      <Box component="ul" data-testid="brand-warehouses-list" sx={{ ...SURFACE_SX, overflow: 'hidden', listStyle: 'none', m: 0, p: 0 }}>
        {desk.warehouses.map((w, index) => (
          <Box component="li" key={w.id}>
            {index > 0 && <Divider sx={{ mx: 2 }} />}
            <WarehouseRow warehouse={w} />
          </Box>
        ))}
      </Box>
    );
  }

  return (
    <Stack spacing={2.5} sx={{ p: 2, maxWidth: 760, mx: 'auto', width: '100%' }} data-testid="brand-warehouses-page">
      <StudioPageHeader icon={<WarehouseRoundedIcon fontSize="small" />} title={t('mweb.studioOptions.brandWarehouses')} />
      {desk.brands.length > 1 && (
        <TextField
          select
          size="small"
          label={t('mweb.brandWarehouses.brand')}
          value={desk.brandId}
          onChange={(e) => desk.selectBrand(e.target.value)}
          data-testid="brand-warehouses-brand"
        >
          {desk.brands.map((b) => (
            <MenuItem key={b.id} value={b.id}>{b.brand_name}</MenuItem>
          ))}
        </TextField>
      )}
      {desk.brandId && (
        <Stack direction="row" sx={{ gap: 1, flexWrap: 'wrap' }}>
          <DuncitButton variant="contained" size="small" startIcon={<SyncRoundedIcon />} loading={desk.syncing} onClick={desk.sync} data-testid="brand-warehouses-sync">
            {t(desk.syncing ? 'mweb.brandWarehouses.syncing' : 'mweb.brandWarehouses.sync')}
          </DuncitButton>
          <DuncitButton variant="outlined" size="small" startIcon={<OpenInNewRoundedIcon />} onClick={() => openPartnerPortal(MANAGE_PATH)} data-testid="brand-warehouses-manage">
            {t('mweb.brandWarehouses.manage')}
          </DuncitButton>
        </Stack>
      )}
      {desk.outcome && <SyncOutcome result={desk.outcome} />}
      {body}
      <Typography variant="caption" sx={{ color: 'text.secondary' }}>{t('mweb.brandWarehouses.manageHint')}</Typography>
    </Stack>
  );
}
