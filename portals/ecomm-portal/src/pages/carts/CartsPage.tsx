import { useMemo } from 'react';
import { useMutation } from '@apollo/client/react';
import { Stack, Typography } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import { dateColumn, EM_DASH, type DuncitColumn } from '@duncit/table';
import { DuncitTabs, useTabParam, type DuncitTabItem } from '@duncit/tabs';
import { PageHeader } from '@duncit/ui';
import BuyerCell from '../../components/BuyerCell';
import StoreTable from '../../components/StoreTable';
import { useTableRefresh } from '../../components/useTableActions';
import { money } from '../../lib/format';
import { REMIND_CART, STORE_CARTS_TABLE, type StoreCartRow } from './queries';

type CartView = 'abandoned' | 'all';

const renderShopper = (row: StoreCartRow) => <BuyerCell email={row.email || EM_DASH} guest={row.is_guest} />;

const renderItems = (row: StoreCartRow) => (
  <Typography variant="body2" sx={{ whiteSpace: 'normal', lineHeight: 1.4, py: 0.5 }}>
    {row.items.join(', ')}
  </Typography>
);

/** Carts with something in them — the ones left idle for an hour are "abandoned", and can be nudged by email. */
export default function CartsPage() {
  const { t } = useTranslation();
  const { refetchRef, run } = useTableRefresh();
  const [remind] = useMutation(REMIND_CART);
  const views = useMemo<DuncitTabItem<CartView>[]>(
    () => [
      { value: 'abandoned', label: t('ecommPortal.carts.abandoned') },
      { value: 'all', label: t('ecommPortal.carts.all') },
    ],
    [t],
  );
  const tabs = useTabParam<CartView>({ items: views, fallback: 'abandoned' });

  const columns = useMemo<DuncitColumn<StoreCartRow>[]>(() => {
    const renderRemind = (row: StoreCartRow) => (
      <DuncitButton
        size="small"
        startIcon={<SendIcon fontSize="small" />}
        disabled={!row.email}
        onClick={() => run(() => remind({ variables: { id: row.id } }), t('ecommPortal.carts.reminded', { vars: { email: row.email } }))}
        aria-label={t('ecommPortal.carts.remindNamed', { vars: { email: row.email || EM_DASH } })}
      >
        {t('ecommPortal.carts.remind')}
      </DuncitButton>
    );
    return [
      { field: 'email', headerName: t('ecommPortal.carts.shopper'), type: 'text', minWidth: 220, flex: 1, cellRenderer: renderShopper, valueGetter: (row) => row.email },
      { field: 'phone', headerName: t('shell.common.phone'), type: 'text', width: 140, sortable: false, filterable: false },
      { field: 'items', headerName: t('ecommPortal.carts.items'), type: 'text', minWidth: 240, flex: 2, sortable: false, filterable: false, cellRenderer: renderItems, valueGetter: (row) => row.items.join(', ') },
      { field: 'item_count', headerName: t('ecommPortal.carts.units'), type: 'number', width: 100, sortable: false, filterable: false },
      { field: 'value', headerName: t('ecommPortal.carts.value'), type: 'number', width: 130, sortable: false, filterable: false, valueGetter: (row) => money(row.value) },
      dateColumn<StoreCartRow>({ field: 'last_activity_at', headerName: t('ecommPortal.carts.lastActive'), hide: false, width: 150 }),
      dateColumn<StoreCartRow>({ field: 'reminded_at', headerName: t('ecommPortal.carts.remindedAt'), hide: false, width: 150, filterable: false }),
      dateColumn<StoreCartRow>({ filterable: false }),
      { field: 'actions', headerName: t('shell.common.actions'), type: 'actions', width: 170, cellRenderer: renderRemind },
    ];
  }, [t, run, remind]);

  return (
    <Stack spacing={3}>
      <PageHeader title={t('ecommPortal.nav.carts')} subtitle={t('ecommPortal.carts.subtitle')} />
      <DuncitTabs {...tabs} aria-label={t('ecommPortal.carts.view')} />
      <StoreTable<StoreCartRow>
        tableId="ecomm-carts"
        query={STORE_CARTS_TABLE}
        resultKey="storeCartsTable"
        extraVariables={{ abandoned_only: tabs.value === 'abandoned' }}
        columns={columns}
        ariaLabel={t('ecommPortal.nav.carts')}
        emptyText={t('ecommPortal.carts.empty')}
        searchPlaceholder={t('ecommPortal.carts.search')}
        defaultSort={{ field: 'last_activity_at', dir: 'desc' }}
        refetchRef={refetchRef}
      />
    </Stack>
  );
}
