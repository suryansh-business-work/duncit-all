import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { useQuery } from '@apollo/client/react';
import { MenuItem, Stack, TextField } from '@mui/material';
import { useDateFormat } from '@duncit/app-settings';
import { useTranslation } from '@duncit/shell';
import { EM_DASH, type DuncitColumn } from '@duncit/table';
import { PageHeader, QueryGuard, SectionCard } from '@duncit/ui';
import ClientTable from '../../components/ClientTable';
import InfoRows from '../../components/InfoRows';
import { OrderStatusChip } from '../../components/chips';
import { money } from '../../lib/format';
import { STORE_COD_LEDGER, type CodLedgerRow } from './queries';

const PERIODS = [7, 30, 90, 365] as const;
const searchOf = (row: CodLedgerRow) => `${row.order_no} ${row.buyer_name} ${row.awb}`;
const idOf = (row: CodLedgerRow) => row.order_id;
const renderStatus = (row: CodLedgerRow) => <OrderStatusChip status={row.status} />;

/**
 * Cash on delivery, for Finance to reconcile against ShipRocket's remittances:
 * what the couriers should have collected, what we have marked collected, and
 * what is still owed.
 */
export default function CodLedgerPage() {
  const { t } = useTranslation();
  const { formatDate } = useDateFormat();
  const navigate = useNavigate();
  const [days, setDays] = useState<number>(30);
  const { data, loading, error } = useQuery(STORE_COD_LEDGER, { variables: { days }, fetchPolicy: 'cache-and-network' });
  const ledger = data?.storeCodLedger;
  const columns = useMemo<DuncitColumn<CodLedgerRow>[]>(() => {
    const date = (value: string | null) => (value ? formatDate(value) : EM_DASH);
    return [
      { field: 'order_no', headerName: t('shell.common.order'), type: 'text', width: 170 },
      { field: 'buyer_name', headerName: t('ecommPortal.common.buyer'), type: 'text', minWidth: 180, flex: 1 },
      { field: 'cod_amount', headerName: t('ecommPortal.shipping.codAmount'), type: 'number', width: 130, valueGetter: (row) => money(row.cod_amount) },
      { field: 'status', headerName: t('shell.common.status'), type: 'text', width: 170, cellRenderer: renderStatus },
      { field: 'awb', headerName: t('ecommPortal.orders.awb'), type: 'text', width: 150, valueGetter: (row) => row.awb || EM_DASH },
      { field: 'delivered_at', headerName: t('ecommPortal.shipping.deliveredOn'), type: 'date', width: 140, valueGetter: (row) => date(row.delivered_at) },
      { field: 'collected_at', headerName: t('ecommPortal.shipping.collectedOn'), type: 'date', width: 140, valueGetter: (row) => date(row.collected_at) },
    ];
  }, [t, formatDate]);

  return (
    <Stack spacing={3}>
      <PageHeader title={t('ecommPortal.nav.codLedger')} subtitle={t('ecommPortal.shipping.codSubtitle')} />
      <TextField select label={t('ecommPortal.shipping.period')} value={days} onChange={(event) => setDays(Number(event.target.value))} sx={{ maxWidth: 220 }}>
        {PERIODS.map((period) => (
          <MenuItem key={period} value={period}>
            {t('ecommPortal.shipping.lastDays', { vars: { days: period } })}
          </MenuItem>
        ))}
      </TextField>
      <QueryGuard loading={loading && !ledger} error={error}>
        {() =>
          ledger && (
            <Stack spacing={3}>
              <SectionCard title={t('ecommPortal.shipping.codTotals')}>
                <InfoRows
                  lines={[
                    { key: 'due', label: t('ecommPortal.shipping.codDue'), value: money(ledger.total_cod) },
                    { key: 'collected', label: t('ecommPortal.shipping.codCollected'), value: money(ledger.collected) },
                    { key: 'outstanding', label: t('ecommPortal.shipping.codOutstanding'), value: money(ledger.outstanding), bold: true },
                  ]}
                />
              </SectionCard>
              <ClientTable<CodLedgerRow>
                tableId="ecomm-cod-ledger"
                rows={ledger.rows}
                columns={columns}
                searchOf={searchOf}
                getRowId={idOf}
                ariaLabel={t('ecommPortal.nav.codLedger')}
                emptyText={t('ecommPortal.shipping.codEmpty')}
                searchPlaceholder={t('ecommPortal.orders.search')}
                onRowClick={(row) => navigate(`/orders/${row.order_id}`)}
              />
            </Stack>
          )
        }
      </QueryGuard>
    </Stack>
  );
}
