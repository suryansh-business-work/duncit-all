import { Alert, AlertTitle, Chip, List, ListItem, ListItemText, Stack, Typography } from '@mui/material';
import { formatDate } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';
import type { DeletionOrder, DeletionPreview, DeletionProduct } from './deletion.queries';

function RunningOrders({ orders, total }: Readonly<{ orders: DeletionOrder[]; total: number }>) {
  const { t } = useTranslation();
  if (orders.length === 0) return null;
  return (
    <Stack spacing={0.5}>
      <Typography variant="subtitle2" component="h3" sx={{ fontWeight: 800 }}>
        {t('partners.deletionRequest.ordersHeading')}
      </Typography>
      <List dense disablePadding aria-label={t('partners.deletionRequest.ordersHeading')}>
        {orders.map((order) => (
          <ListItem key={order.id} disableGutters divider secondaryAction={<Chip size="small" variant="outlined" label={order.fulfilment_status} />}>
            <ListItemText
              primary={order.order_no}
              secondary={t('partners.deletionRequest.orderLine', {
                vars: { date: formatDate(order.created_at), units: order.units },
              })}
            />
          </ListItem>
        ))}
      </List>
      {total > orders.length && (
        <Typography variant="caption" sx={{ color: 'text.secondary' }}>
          {t('partners.deletionRequest.ordersMore', { vars: { shown: orders.length, total } })}
        </Typography>
      )}
    </Stack>
  );
}

function BrandProducts({ products }: Readonly<{ products: DeletionProduct[] }>) {
  const { t } = useTranslation();
  if (products.length === 0) return null;
  return (
    <Stack spacing={0.5}>
      <Typography variant="subtitle2" component="h3" sx={{ fontWeight: 800 }}>
        {t('partners.deletionRequest.productsHeading', { vars: { count: products.length } })}
      </Typography>
      <List dense disablePadding aria-label={t('partners.deletionRequest.productsHeading', { vars: { count: products.length } })}>
        {products.map((product) => (
          <ListItem
            key={product.id}
            disableGutters
            secondaryAction={
              product.is_active ? undefined : <Chip size="small" color="warning" variant="outlined" label={t('partners.ecommBrandPage.paused')} />
            }
          >
            <ListItemText primary={product.product_name} />
          </ListItem>
        ))}
      </List>
    </Stack>
  );
}

/** The warning before a live item is deleted: what is still running on it, and how the request plays out. */
export default function DeletionImpact({ preview }: Readonly<{ preview: DeletionPreview }>) {
  const { t } = useTranslation();
  const { open_orders: openOrders, open_returns: openReturns, orders, products } = preview.impact;
  const busy = openOrders > 0 || openReturns > 0;
  const brand = preview.kind === 'BRAND';

  return (
    <Stack spacing={2}>
      <Alert severity={busy ? 'warning' : 'info'} role="status" data-testid="deletion-impact">
        <AlertTitle>{busy ? t('partners.deletionRequest.warningTitle') : t('partners.deletionRequest.noRunningTitle')}</AlertTitle>
        {busy
          ? t('partners.deletionRequest.warningCounts', { vars: { orders: openOrders, returns: openReturns } })
          : t('partners.deletionRequest.noRunningBody')}
      </Alert>
      <Typography variant="body2">{t('partners.deletionRequest.howItWorks')}</Typography>
      {brand && <Typography variant="body2">{t('partners.deletionRequest.brandWaitsForProducts')}</Typography>}
      <RunningOrders orders={orders} total={openOrders} />
      {brand && <BrandProducts products={products} />}
    </Stack>
  );
}
