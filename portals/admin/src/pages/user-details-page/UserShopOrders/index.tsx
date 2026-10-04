import { useMemo } from 'react';
import { useDateFormat } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';
import UserLog from '../UserFinanceSection/UserLog';
import { shopOrderColumns } from './shopOrderColumns';
import { USER_SHOP_ORDERS_TABLE, type UserShopOrderRow } from './queries';

/** Admin › User › Shop Orders: every Pod Shop order this member placed, with its status and refund. */
export default function UserShopOrders({ userId }: Readonly<{ userId: string }>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  const columns = useMemo(() => shopOrderColumns(t, formatDateTime), [t, formatDateTime]);
  return (
    <UserLog<UserShopOrderRow>
      userId={userId}
      userVariable="user_id"
      tableId="admin-user-shop-orders"
      title={t('admin.userShopOrders.title')}
      emptyText={t('admin.userShopOrders.empty')}
      searchPlaceholder={t('admin.userShopOrders.search')}
      document={USER_SHOP_ORDERS_TABLE}
      rootField="userProductOrdersTable"
      columns={columns}
      defaultSortField="created_at"
    />
  );
}
