import { useMemo } from 'react';
import { DuncitTable, type TableFetch } from '@duncit/table';
import type { DateFormatter } from '@duncit/app-settings';
import type { CoinTxnRow } from '../queries';
import { useTranslation } from '@duncit/app-settings';
import { buildColumns, getCoinRowId } from './columns';

interface Props {
  fetchRows: TableFetch<CoinTxnRow>;
  currencySymbol: string;
  formatDateTime: DateFormatter['formatDateTime'];
  /** The pod the page is scoped to, '' for all. Routed through the table's
   * external-filter channel so a change resets to page 1 and refetches; the
   * server does the real scoping from the `pod_doc_id` variable and drops this
   * unknown filter field. */
  podId: string;
}

export default function CoinTransactionsTable({
  fetchRows,
  currencySymbol,
  formatDateTime,
  podId,
}: Readonly<Props>) {
  const { t } = useTranslation();
  // Memoised: DuncitTable rebuilds its AG Grid column defs whenever this array
  // changes identity, which would drop the admin's column widths every render.
  const columns = useMemo(
    () => buildColumns(t, currencySymbol, formatDateTime),
    [t, currencySymbol, formatDateTime],
  );

  return (
    <DuncitTable<CoinTxnRow>
      ariaLabel={t('shell.nav.transactions')}
      tableId="admin-coin-transactions"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getCoinRowId}
      externalFilters={[{ field: 'pod_doc_id', op: 'eq', value: podId }]}
      emptyText={t('finance.duncitCoin.noCoinActivityYet')}
      defaultSort={{ field: 'created_at', dir: 'desc' }}
      defaultPageSize={10}
      searchPlaceholder="Search payment id or reason"
    />
  );
}
