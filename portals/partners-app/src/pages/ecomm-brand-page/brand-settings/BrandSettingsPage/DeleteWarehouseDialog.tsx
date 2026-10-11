import { Link as RouterLink } from 'react-router';
import { useQuery } from '@apollo/client/react';
import {
  Alert, CircularProgress, Dialog, DialogActions, DialogContent, DialogTitle, Link, List, ListItem, ListItemText, Stack, Typography,
} from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/shell';
import { MY_WAREHOUSE_USAGE, type BrandWarehouse, type MyWarehouseUsageData } from '../warehouse.queries';

/** What the partner asked to do with the pickup address. */
export type PickupRemoval = { warehouse: BrandWarehouse; action: 'delete' | 'disable' };

interface Props {
  brandId: string;
  target: PickupRemoval | null;
  busy: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

type Translate = ReturnType<typeof useTranslation>['t'];

/** Why the address cannot go yet, when it cannot: it is the primary one, or products still ship from it. */
function blockerOf(target: PickupRemoval, count: number, t: Translate): string | null {
  const name = target.warehouse.nickname;
  if (target.action === 'disable' && target.warehouse.is_default) return t('partners.warehouses.primaryBlocked', { vars: { name } });
  if (count > 0) return t('partners.warehouses.inUse', { vars: { count, name } });
  return null;
}

/**
 * Confirms deleting or disabling a pickup address — after showing what still
 * ships from it. An address in use cannot go, so instead of a bare refusal the
 * partner gets the products to move, each a link to where its pickup address is
 * changed. The server holds the same rule.
 */
export default function DeleteWarehouseDialog({ brandId, target, busy, onCancel, onConfirm }: Readonly<Props>) {
  const { t } = useTranslation();
  const { data, loading, error } = useQuery<MyWarehouseUsageData>(MY_WAREHOUSE_USAGE, {
    variables: { brand_doc_id: brandId, id: target?.warehouse.id ?? '' },
    skip: !target,
    fetchPolicy: 'network-only',
  });
  const usage = data?.myBrandPickupLocationUsage;
  const deleting = target?.action === 'delete';
  const name = target?.warehouse.nickname ?? '';
  const blocker = target && usage ? blockerOf(target, usage.count, t) : null;
  const unlisted = usage ? usage.count - usage.products.length : 0;
  const ready = !!usage && !blocker && !loading;

  return (
    <Dialog open={Boolean(target)} onClose={onCancel} fullWidth maxWidth="xs" aria-labelledby="pickup-removal-title">
      <DialogTitle id="pickup-removal-title">
        {deleting ? t('partners.ecommBrandPage.deleteWarehouse') : t('partners.warehouses.disableTitle')}
      </DialogTitle>
      <DialogContent>
        {loading && (
          <Stack direction="row" spacing={1.5} sx={{ alignItems: 'center' }} role="status">
            <CircularProgress size={18} />
            <Typography variant="body2">{t('partners.warehouses.checkingUsage')}</Typography>
          </Stack>
        )}
        {error && !loading && (
          <Alert severity="error">
            {t('partners.warehouses.usageFailed')} {parseApiError(error)}
          </Alert>
        )}
        {blocker && (
          <Alert severity="warning" data-testid="pickup-removal-blocked">
            {blocker}
          </Alert>
        )}
        {usage && usage.products.length > 0 && (
          <List dense aria-label={t('partners.warehouses.productsList')} data-testid="pickup-removal-products">
            {usage.products.map((product) => (
              <ListItem key={product.id} disableGutters>
                <ListItemText
                  primary={
                    <Link
                      component={RouterLink}
                      to={`/ecomm-brand/${brandId}/products/${product.id}`}
                      aria-label={t('partners.warehouses.openProduct', { vars: { name: product.name } })}
                    >
                      {product.name}
                    </Link>
                  }
                  secondary={product.status}
                />
              </ListItem>
            ))}
          </List>
        )}
        {unlisted > 0 && (
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {t('partners.warehouses.inUseMore', { vars: { count: unlisted } })}
          </Typography>
        )}
        {ready && (
          <Typography>
            {deleting
              ? t('partners.warehouses.deleteConfirm', { vars: { name } })
              : t('partners.warehouses.disableConfirm', { vars: { name } })}
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <DuncitButton onClick={onCancel}>{t('shell.common.cancel')}</DuncitButton>
        <DuncitButton
          color={deleting ? 'error' : 'warning'}
          variant="contained"
          disabled={busy || !ready}
          onClick={onConfirm}
          data-testid="pickup-removal-confirm"
        >
          {deleting ? t('shell.common.delete') : t('partners.warehouses.disable')}
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
