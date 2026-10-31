import { useMemo, type ReactNode, type RefObject } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { DuncitTable, useApolloTableFetch, type TableFilterValue } from '@duncit/table';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import { MARKETING_LEADS_TABLE, type MarketingLeadRow } from './queries';
import { getLeadColumns } from './leadColumns';

const getRowId = (row: MarketingLeadRow) => row.id;

interface Props {
  /** Page-level pins (a stage, a pipeline off the URL) appended to the grid's own filters. */
  extraFilters?: ReadonlyArray<TableFilterValue>;
  onOpen: (lead: MarketingLeadRow) => void;
  refetchRef: RefObject<(() => void) | null>;
  /** New lead and Import, beside the search. */
  toolbarActions?: ReactNode;
}

/** Every lead the server has, newest first, server-paged; a row opens the lead. */
export default function LeadsTable({ extraFilters, onOpen, refetchRef, toolbarActions }: Readonly<Props>) {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat({ timeZoneAware: true });
  const client = useApolloClient();
  const fetchRows = useApolloTableFetch<MarketingLeadRow>(client, MARKETING_LEADS_TABLE, 'marketingLeadsTable');
  const columns = useMemo(() => getLeadColumns(t, formatDateTime, onOpen), [t, formatDateTime, onOpen]);

  return (
    <DuncitTable<MarketingLeadRow>
      ariaLabel={t('marketing.leads.tableLabel')}
      tableId="marketing-leads"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      onRowClick={onOpen}
      externalFilters={extraFilters}
      refetchRef={refetchRef}
      toolbarActions={toolbarActions}
      emptyText={t('marketing.leads.empty')}
      searchPlaceholder={t('marketing.leads.search')}
      defaultSort={{ field: 'created_at', dir: 'desc' }}
    />
  );
}
