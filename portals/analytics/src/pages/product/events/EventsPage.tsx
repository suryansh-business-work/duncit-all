import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { useApolloClient, useQuery } from '@apollo/client/react';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import { DuncitTable, useApolloTableFetch, type TableFilterValue } from '@duncit/table';
import { DistributionCard } from '@duncit/ui';
import ProductPage from '../ProductPage';
import { PAGE_COPY } from '../page-copy';
import ProductFilterBar from '../ProductFilterBar';
import { useProductFilter } from '../useProductFilter';
import { PRODUCT_EVENT_NAMES, PRODUCT_EVENTS_TABLE, type ProductEvent } from '../queries';
import { eventColumns } from './event-columns';
import EventDetail from './EventDetail';

/** `?user=` and `?session=` narrow the table to one member or one session — the links other pages open. */
function pinnedFilters(params: URLSearchParams): TableFilterValue[] {
  const pins: TableFilterValue[] = [];
  const user = params.get('user');
  const session = params.get('session');
  if (user) pins.push({ field: 'user_id', op: 'eq', value: user });
  if (session) pins.push({ field: 'session_id', op: 'eq', value: session });
  return pins;
}

/** Analytics > Product > Events — every stored event, how often each kind happens, and any one's properties. */
export default function EventsPage() {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat({ timeZoneAware: true });
  const client = useApolloClient();
  const [params] = useSearchParams();
  const { period, setPeriod, filter } = useProductFilter();
  const [selected, setSelected] = useState<ProductEvent | null>(null);
  const pins = useMemo(() => pinnedFilters(params), [params]);
  const columns = useMemo(() => eventColumns(t, formatDateTime), [t, formatDateTime]);
  const names = useQuery(PRODUCT_EVENT_NAMES, { variables: { filter } });
  const fetchRows = useApolloTableFetch<ProductEvent>(
    client,
    PRODUCT_EVENTS_TABLE,
    'productEventsTable',
    { extraVariables: { filter } },
    [filter]
  );
  return (
    <ProductPage
      copy={PAGE_COPY.events}
      actions={<ProductFilterBar value={period} onChange={setPeriod} />}
      testId="product-events"
    >
      <DistributionCard
        title={t('analytics.product.events.frequency')}
        buckets={(names.data?.productEventNames ?? []).slice(0, 12)}
        emptyText={t(names.loading ? 'analytics.product.loading' : 'analytics.product.empty')}
      />
      <DuncitTable
        tableId="analytics-product-events"
        columns={columns}
        fetchRows={fetchRows}
        externalFilters={pins}
        getRowId={(row) => row.id}
        onRowClick={setSelected}
        defaultSort={{ field: 'occurred_at', dir: 'desc' }}
        searchPlaceholder={t('analytics.product.events.search')}
        emptyText={t('analytics.product.empty')}
        ariaLabel={t('analytics.product.events.title')}
      />
      <EventDetail event={selected} onClose={() => setSelected(null)} />
    </ProductPage>
  );
}
