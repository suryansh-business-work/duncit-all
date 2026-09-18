import { useMemo } from 'react';
import { useNavigate } from 'react-router';
import { Stack } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { dateColumn, EM_DASH, type DuncitColumn } from '@duncit/table';
import { PageHeader } from '@duncit/ui';
import BuyerCell from '../../components/BuyerCell';
import StoreTable from '../../components/StoreTable';
import { money } from '../../lib/format';
import { STORE_CUSTOMERS_TABLE, type StoreCustomerRow } from './queries';

const renderCustomer = (row: StoreCustomerRow) => <BuyerCell name={row.name} email={row.email} guest={row.is_guest} />;

/** Everyone who has ordered from the store — account holders and guests — by what they have spent. */
export default function CustomersPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const columns = useMemo<DuncitColumn<StoreCustomerRow>[]>(
    () => [
      { field: 'name', headerName: t('ecommPortal.common.buyer'), type: 'text', minWidth: 240, flex: 1, filterable: false, cellRenderer: renderCustomer, valueGetter: (row) => row.name },
      { field: 'email', headerName: t('shell.common.email'), type: 'text', width: 220, hide: true, filterable: false },
      { field: 'phone', headerName: t('shell.common.phone'), type: 'text', width: 150, sortable: false, filterable: false, valueGetter: (row) => row.phone || EM_DASH },
      { field: 'is_guest', headerName: t('ecommPortal.common.guest'), type: 'boolean', width: 110, sortable: false, valueGetter: (row) => (row.is_guest ? t('shell.common.yes') : t('shell.common.no')) },
      { field: 'orders', headerName: t('ecommPortal.nav.orders'), type: 'number', width: 110 },
      { field: 'cancelled', headerName: t('ecommPortal.customers.cancelled'), type: 'number', width: 120, sortable: false, filterable: false },
      { field: 'spent', headerName: t('ecommPortal.customers.spent'), type: 'number', width: 140, valueGetter: (row) => money(row.spent) },
      dateColumn<StoreCustomerRow>({ field: 'last_order_at', headerName: t('ecommPortal.customers.lastOrder'), hide: false, width: 150, filterable: false }),
      dateColumn<StoreCustomerRow>({ field: 'first_order_at', headerName: t('ecommPortal.customers.firstOrder'), width: 150, filterable: false }),
    ],
    [t],
  );
  return (
    <Stack spacing={3}>
      <PageHeader title={t('ecommPortal.nav.customers')} subtitle={t('ecommPortal.customers.subtitle')} />
      <StoreTable<StoreCustomerRow>
        tableId="ecomm-customers"
        query={STORE_CUSTOMERS_TABLE}
        resultKey="storeCustomersTable"
        columns={columns}
        ariaLabel={t('ecommPortal.nav.customers')}
        emptyText={t('ecommPortal.customers.empty')}
        searchPlaceholder={t('ecommPortal.customers.search')}
        defaultSort={{ field: 'last_order_at', dir: 'desc' }}
        onRowClick={(customer) => navigate(`/customers/${encodeURIComponent(customer.email)}`)}
      />
    </Stack>
  );
}
