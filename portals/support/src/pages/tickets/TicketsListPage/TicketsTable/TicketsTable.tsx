import { useMemo, type MutableRefObject, type ReactNode } from 'react';
import { DuncitTable, type TableFetch, type TableFilterValue } from '@duncit/table';
import { useTranslation } from '@duncit/shell';
import type { Ticket } from '../../../../graphql/tickets';
import { buildColumns, getTicketRowId } from './columns';

interface Props {
  fetchRows: TableFetch<Ticket>;
  refetchRef: MutableRefObject<(() => void) | null>;
  toolbarActions?: ReactNode;
  externalFilters?: ReadonlyArray<TableFilterValue>;
  onRowClick: (t: Ticket) => void;
}

export default function TicketsTable({
  fetchRows,
  refetchRef,
  toolbarActions,
  externalFilters,
  onRowClick,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const columns = useMemo(() => buildColumns(t), [t]);
  return (
    <DuncitTable<Ticket>
      ariaLabel={t('support.tickets.title')}
      tableId="support-tickets"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getTicketRowId}
      onRowClick={onRowClick}
      toolbarActions={toolbarActions}
      externalFilters={externalFilters}
      emptyText={t('support.tickets.empty')}
      defaultSort={{ field: 'last_message_at', dir: 'desc' }}
      searchPlaceholder="Search subject"
      refetchRef={refetchRef}
    />
  );
}
