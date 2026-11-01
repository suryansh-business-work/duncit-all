import { useMemo, useState } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import { DuncitTable, useApolloTableFetch } from '@duncit/table';
import ProductPage from '../ProductPage';
import { PAGE_COPY } from '../page-copy';
import ProductFilterBar from '../ProductFilterBar';
import { useProductFilter } from '../useProductFilter';
import { PRODUCT_SESSIONS_TABLE, type ProductSession } from '../queries';
import { sessionColumns } from './session-columns';
import SessionDetail from './SessionDetail';

/** Analytics > Product > Sessions — every app session of the period; a row opens its events in order. */
export default function SessionsPage() {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat({ timeZoneAware: true });
  const client = useApolloClient();
  const { period, setPeriod, filter } = useProductFilter();
  const [selected, setSelected] = useState<string | null>(null);
  const columns = useMemo(() => sessionColumns(t, formatDateTime), [t, formatDateTime]);
  const fetchRows = useApolloTableFetch<ProductSession>(
    client,
    PRODUCT_SESSIONS_TABLE,
    'productSessionsTable',
    { extraVariables: { filter } },
    [filter]
  );
  return (
    <ProductPage
      copy={PAGE_COPY.sessions}
      actions={<ProductFilterBar value={period} onChange={setPeriod} />}
      testId="product-sessions"
    >
      <DuncitTable
        tableId="analytics-product-sessions"
        columns={columns}
        fetchRows={fetchRows}
        getRowId={(row) => row.session_id}
        onRowClick={(row) => setSelected(row.session_id)}
        defaultSort={{ field: 'started_at', dir: 'desc' }}
        searchPlaceholder={t('analytics.product.sessions.search')}
        emptyText={t('analytics.product.empty')}
        ariaLabel={t('analytics.product.sessions.title')}
      />
      <SessionDetail sessionId={selected} onClose={() => setSelected(null)} />
    </ProductPage>
  );
}
