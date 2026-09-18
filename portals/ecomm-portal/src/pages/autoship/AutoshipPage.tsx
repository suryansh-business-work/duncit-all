import { useCallback, useMemo } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import { Chip, Stack } from '@mui/material';
import { useConfirm } from '@duncit/dialogs';
import { useTranslation } from '@duncit/shell';
import { dateColumn, EM_DASH, type DuncitColumn } from '@duncit/table';
import { PageHeader, StatusChip, type StatusColorMap } from '@duncit/ui';
import BuyerCell from '../../components/BuyerCell';
import StoreTable from '../../components/StoreTable';
import { useTableRefresh } from '../../components/useTableActions';
import { codeLabel, codeOptions } from '../../lib/status';
import {
  AUTOSHIP_TERMS,
  SET_SUBSCRIPTION_STATUS,
  STORE_SUBSCRIPTIONS_TABLE,
  SUBSCRIPTION_MODE_KEYS,
  SUBSCRIPTION_STATUS_KEYS,
  type StoreSubscriptionRow,
  type SubscriptionStatus,
} from './queries';
import SubscriptionActions from './SubscriptionActions';

const STATUS_COLORS: StatusColorMap = { ACTIVE: 'success', PAUSED: 'warning', CANCELLED: 'default' };

const STATUS_SUCCESS_KEYS: Record<SubscriptionStatus, string> = {
  ACTIVE: 'ecommPortal.autoship.resumed',
  PAUSED: 'ecommPortal.autoship.paused',
  CANCELLED: 'ecommPortal.autoship.cancelled',
};

const renderBuyer = (row: StoreSubscriptionRow) => <BuyerCell name={row.buyer_name} email={row.buyer_email} guest={false} />;

/** Subscribe-and-save plans: who gets what, how often, and what happened on the last run. */
export default function AutoshipPage() {
  const { t } = useTranslation();
  const confirm = useConfirm();
  const { refetchRef, run } = useTableRefresh();
  const [setStatus] = useMutation(SET_SUBSCRIPTION_STATUS);
  const terms = useQuery(AUTOSHIP_TERMS, { fetchPolicy: 'cache-and-network' }).data?.storeAdminSettings;

  const onSet = useCallback(
    async (row: StoreSubscriptionRow, status: SubscriptionStatus) => {
      const name = row.buyer_name || row.buyer_email;
      if (status === 'CANCELLED') {
        const ok = await confirm({
          title: t('ecommPortal.autoship.cancelTitle', { vars: { name } }),
          message: t('ecommPortal.autoship.cancelMessage', { vars: { product: row.product_name } }),
          destructive: true,
          confirmLabel: t('ecommPortal.autoship.cancelPlan'),
          cancelLabel: t('ecommPortal.autoship.keepPlan'),
        });
        if (!ok) return;
      }
      await run(() => setStatus({ variables: { id: row.id, status } }), t(STATUS_SUCCESS_KEYS[status]));
    },
    [confirm, run, setStatus, t],
  );

  const columns = useMemo<DuncitColumn<StoreSubscriptionRow>[]>(
    () => [
      { field: 'buyer_name', headerName: t('ecommPortal.common.buyer'), type: 'text', minWidth: 200, flex: 1, filterable: false, cellRenderer: renderBuyer },
      {
        field: 'product_name',
        headerName: t('ecommPortal.common.product'),
        type: 'text',
        minWidth: 220,
        flex: 1,
        filterable: false,
        valueGetter: (row) => [row.product_name, row.variant_label, t('ecommPortal.common.qtyTimes', { vars: { qty: row.qty } })].filter(Boolean).join(' · '),
      },
      {
        field: 'frequency_weeks',
        headerName: t('ecommPortal.autoship.frequency'),
        type: 'number',
        width: 150,
        filterable: false,
        valueGetter: (row) => t('ecommPortal.autoship.everyWeeks', { count: row.frequency_weeks }),
      },
      { field: 'mode', headerName: t('ecommPortal.autoship.mode'), type: 'enum', options: codeOptions(SUBSCRIPTION_MODE_KEYS, t), width: 170, sortable: false, valueGetter: (row) => codeLabel(SUBSCRIPTION_MODE_KEYS, row.mode, t) },
      {
        field: 'status',
        headerName: t('shell.common.status'),
        type: 'enum',
        options: codeOptions(SUBSCRIPTION_STATUS_KEYS, t),
        width: 130,
        cellRenderer: (row) => <StatusChip status={row.status} label={codeLabel(SUBSCRIPTION_STATUS_KEYS, row.status, t)} colorMap={STATUS_COLORS} />,
        valueGetter: (row) => codeLabel(SUBSCRIPTION_STATUS_KEYS, row.status, t),
      },
      dateColumn<StoreSubscriptionRow>({ field: 'next_run_at', headerName: t('ecommPortal.autoship.nextRun'), hide: false, width: 150 }),
      dateColumn<StoreSubscriptionRow>({ field: 'last_run_at', headerName: t('ecommPortal.autoship.lastRun'), width: 150, filterable: false, sortable: false }),
      { field: 'last_order_no', headerName: t('ecommPortal.autoship.lastOrder'), type: 'text', width: 150, sortable: false, filterable: false, valueGetter: (row) => row.last_order_no || EM_DASH },
      { field: 'run_count', headerName: t('ecommPortal.autoship.runs'), type: 'number', width: 90, filterable: false },
      { field: 'failures', headerName: t('ecommPortal.autoship.failures'), type: 'number', width: 100, sortable: false, filterable: false },
      { field: 'buyer_email', headerName: t('shell.common.email'), type: 'text', width: 200, hide: true, sortable: false },
      dateColumn<StoreSubscriptionRow>(),
      { field: 'actions', headerName: t('shell.common.actions'), type: 'actions', width: 230, cellRenderer: (row) => <SubscriptionActions row={row} onSet={onSet} /> },
    ],
    [t, onSet],
  );

  const termsChip = terms && (
    <Chip
      color={terms.autoship_enabled ? 'success' : 'default'}
      label={
        terms.autoship_enabled
          ? t('ecommPortal.autoship.discountOn', { vars: { pct: terms.autoship_discount_pct } })
          : t('ecommPortal.autoship.off')
      }
    />
  );

  return (
    <Stack spacing={3}>
      <PageHeader title={t('ecommPortal.nav.autoship')} subtitle={t('ecommPortal.autoship.subtitle')} actions={termsChip} />
      <StoreTable<StoreSubscriptionRow>
        tableId="ecomm-autoship"
        query={STORE_SUBSCRIPTIONS_TABLE}
        resultKey="storeSubscriptionsTable"
        columns={columns}
        ariaLabel={t('ecommPortal.nav.autoship')}
        emptyText={t('ecommPortal.autoship.empty')}
        searchPlaceholder={t('ecommPortal.autoship.search')}
        defaultSort={{ field: 'next_run_at', dir: 'asc' }}
        refetchRef={refetchRef}
      />
    </Stack>
  );
}
