import { useMemo } from 'react';
import { useNavigate } from 'react-router';
import { Stack } from '@mui/material';
import { useTranslation } from '@duncit/shell';
import { dateColumn, type DuncitColumn } from '@duncit/table';
import { PageHeader } from '@duncit/ui';
import BuyerCell from '../../components/BuyerCell';
import { ReturnStatusChip } from '../../components/chips';
import CodeWithDate from '../../components/CodeWithDate';
import StoreTable from '../../components/StoreTable';
import { money } from '../../lib/format';
import { codeLabel, codeOptions, REFUND_MODE_KEYS, RETURN_STATUS_KEYS } from '../../lib/status';
import { STORE_RETURNS_TABLE, type StoreReturn } from './queries';

const renderBuyer = (row: StoreReturn) => <BuyerCell name={row.buyer_name} email={row.buyer_email} guest={row.is_guest} />;
const renderStatus = (row: StoreReturn) => <ReturnStatusChip status={row.status} />;
const renderReturn = (row: StoreReturn) => <CodeWithDate code={row.return_no} at={row.created_at} />;
const unitsOf = (row: StoreReturn) => row.items.reduce((sum, item) => sum + item.qty, 0);

/** Every return request, newest first — open one to approve, receive and refund it. */
export default function ReturnsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const columns = useMemo<DuncitColumn<StoreReturn>[]>(
    () => [
      { field: 'return_no', headerName: t('ecommPortal.returns.return'), type: 'text', width: 180, filterable: false, cellRenderer: renderReturn, valueGetter: (row) => row.return_no },
      { field: 'order_no', headerName: t('shell.common.order'), type: 'text', width: 150 },
      { field: 'buyer_name', headerName: t('ecommPortal.common.buyer'), type: 'text', minWidth: 220, flex: 1, filterable: false, cellRenderer: renderBuyer, valueGetter: (row) => row.buyer_name },
      { field: 'buyer_email', headerName: t('shell.common.email'), type: 'text', width: 200, hide: true, sortable: false },
      { field: 'items', headerName: t('ecommPortal.orders.units'), type: 'number', width: 90, sortable: false, filterable: false, valueGetter: unitsOf },
      { field: 'reason', headerName: t('ecommPortal.returns.reason'), type: 'text', minWidth: 180, flex: 1, sortable: false, filterable: false },
      {
        field: 'status',
        headerName: t('shell.common.status'),
        type: 'enum',
        options: codeOptions(RETURN_STATUS_KEYS, t),
        width: 160,
        cellRenderer: renderStatus,
        valueGetter: (row) => codeLabel(RETURN_STATUS_KEYS, row.status, t),
      },
      { field: 'refund_amount', headerName: t('ecommPortal.returns.refund'), type: 'number', width: 130, filterable: false, valueGetter: (row) => money(row.refund_amount) },
      {
        field: 'refund_mode',
        headerName: t('ecommPortal.returns.refundMode'),
        type: 'enum',
        options: codeOptions(REFUND_MODE_KEYS, t),
        width: 160,
        hide: true,
        sortable: false,
        valueGetter: (row) => codeLabel(REFUND_MODE_KEYS, row.refund_mode, t),
      },
      dateColumn<StoreReturn>({ headerName: t('ecommPortal.returns.requested'), width: 150 }),
    ],
    [t],
  );
  return (
    <Stack spacing={3}>
      <PageHeader title={t('ecommPortal.nav.returns')} subtitle={t('ecommPortal.returns.subtitle')} />
      <StoreTable<StoreReturn>
        tableId="ecomm-returns"
        query={STORE_RETURNS_TABLE}
        resultKey="storeReturnsTable"
        columns={columns}
        ariaLabel={t('ecommPortal.nav.returns')}
        emptyText={t('ecommPortal.returns.empty')}
        searchPlaceholder={t('ecommPortal.returns.search')}
        defaultSort={{ field: 'created_at', dir: 'desc' }}
        onRowClick={(row) => navigate(`/returns/${row.id}`)}
      />
    </Stack>
  );
}
