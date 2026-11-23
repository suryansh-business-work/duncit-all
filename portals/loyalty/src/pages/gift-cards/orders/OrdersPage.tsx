import { useNavigate } from 'react-router';
import { Stack } from '@mui/material';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import { useTranslation } from '@duncit/app-settings';
import TablePageHeader from '../../../components/TablePageHeader';
import { useTableRows } from '../../../lib/useTableRows';
import OrderStatTiles from './OrderStatTiles';
import OrdersTable from './OrdersTable';
import { GIFT_CARD_ORDERS_TABLE, type GiftCardAdminOrder } from './queries';

export const giftOrderPath = (id: string) => `/gift-cards/orders/${id}`;

/**
 * Loyalty > Gift Card Orders — every order mWeb and the app placed, digital and
 * printed, with what each is waiting on: payment, printing, the courier.
 */
export default function OrdersPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { total, fetchRows } = useTableRows<GiftCardAdminOrder>(GIFT_CARD_ORDERS_TABLE, 'giftCardOrdersTable');
  return (
    <Stack spacing={2.5}>
      <TablePageHeader icon={<ReceiptLongIcon color="primary" />} title={t('loyalty.giftOrders.title')} total={total} />
      <OrderStatTiles />
      <OrdersTable fetchRows={fetchRows} onRowClick={(row) => navigate(giftOrderPath(row.id))} />
    </Stack>
  );
}
