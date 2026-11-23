import { useMemo, type MutableRefObject } from 'react';
import { DuncitTable, type TableFetch } from '@duncit/table';
import { useTranslation } from '@duncit/app-settings';
import { buildRequestColumns, type DecideHandler } from './columns';
import type { RequestRow } from './queries';

const getRowId = (row: RequestRow) => row.id;

interface Props {
  fetchRows: TableFetch<RequestRow>;
  /** Filled by the table, so a decision can reload it. */
  refetchRef: MutableRefObject<(() => void) | null>;
  onDecide: DecideHandler;
}

/** Alternative-verification requests, newest first. Filtering, sorting and paging run on the server. */
export default function VerificationRequestsTable({ fetchRows, refetchRef, onDecide }: Readonly<Props>) {
  const { t } = useTranslation();
  const columns = useMemo(() => buildRequestColumns(t, onDecide), [t, onDecide]);
  return (
    <DuncitTable<RequestRow>
      ariaLabel={t('tech.verificationRequests.title')}
      tableId="tech-verification-requests"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      refetchRef={refetchRef}
      emptyText={t('tech.verificationRequests.empty')}
      defaultSort={{ field: 'created_at', dir: 'desc' }}
      searchPlaceholder={t('tech.verificationRequests.searchHint')}
    />
  );
}
