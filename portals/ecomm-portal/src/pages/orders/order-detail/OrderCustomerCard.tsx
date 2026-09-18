import { Link as RouterLink } from 'react-router';
import { Divider, Link, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { SectionCard } from '@duncit/ui';
import BuyerCell from '../../../components/BuyerCell';
import type { OrderAddress, StoreAdminOrder } from '../queries';

const addressLines = (address: OrderAddress): string[] =>
  [
    address.name,
    address.line1,
    address.line2,
    address.landmark,
    [address.city, address.state, address.pincode].filter(Boolean).join(', '),
    address.country,
    address.phone,
  ].filter(Boolean);

/** Who bought it, how to reach them, where it is going — and the way to the rest of their orders. */
export default function OrderCustomerCard({ detail }: Readonly<{ detail: StoreAdminOrder }>) {
  const { t } = useTranslation();
  const { order } = detail;
  const address = order.shipping_address;
  return (
    <SectionCard title={t('ecommPortal.orders.customer')}>
      <Stack spacing={1}>
        <BuyerCell name={order.buyer_name} email={order.buyer_email} guest={detail.is_guest} />
        {order.buyer_phone && <Typography variant="body2">{order.buyer_phone}</Typography>}
        <Link component={RouterLink} to={`/customers/${encodeURIComponent(order.buyer_email)}`} variant="body2">
          {t('ecommPortal.orders.viewCustomer', { count: detail.customer_order_count })}
        </Link>
      </Stack>
      <Divider sx={{ my: 2 }} />
      <Typography component="h3" variant="subtitle2" sx={{ mb: 0.5 }}>
        {t('ecommPortal.orders.shipTo')}
      </Typography>
      {address ? (
        <Typography variant="body2" component="address" sx={{ fontStyle: 'normal', whiteSpace: 'pre-line' }}>
          {addressLines(address).join('\n')}
        </Typography>
      ) : (
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('ecommPortal.orders.noAddress')}
        </Typography>
      )}
    </SectionCard>
  );
}
