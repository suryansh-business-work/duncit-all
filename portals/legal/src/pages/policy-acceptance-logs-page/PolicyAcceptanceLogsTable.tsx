import { useMemo } from 'react';
import { DuncitTable, type TableFetch } from '@duncit/table';
import { useTranslation, type DateFormatter } from '@duncit/app-settings';
import type { PolicyAcceptance } from '../../graphql/policyAcceptance';
import { getPolicyAcceptanceColumns } from './columns';

interface Props {
  fetchRows: TableFetch<PolicyAcceptance>;
  /** Admin-configured date + time, so "When" reads the same clock as every
   * other screen in the platform. */
  formatDateTime: DateFormatter['formatDateTime'];
  /** Open the full record behind a row. */
  onOpen: (row: PolicyAcceptance) => void;
}

const getAcceptanceRowId = (row: PolicyAcceptance) => row.id;

/**
 * The acceptance log itself — newest first, because the question an auditor
 * arrives with is "what has just been accepted", and read-only throughout: an
 * acceptance is a record of something a person did, so nothing here edits one.
 */
export default function PolicyAcceptanceLogsTable({
  fetchRows,
  formatDateTime,
  onOpen,
}: Readonly<Props>) {
  const { t } = useTranslation();
  // Memoised: DuncitTable rebuilds its AG Grid column defs whenever this array
  // changes identity, which would drop the admin's column widths every render.
  const columns = useMemo(
    () => getPolicyAcceptanceColumns(t, formatDateTime),
    [t, formatDateTime],
  );

  return (
    <DuncitTable<PolicyAcceptance>
      tableId="legal-policy-acceptance-logs"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getAcceptanceRowId}
      onRowClick={onOpen}
      emptyText={t('legalAcceptanceLogs.empty')}
      defaultSort={{ field: 'accepted_at', dir: 'desc' }}
      searchPlaceholder={t('legalAcceptanceLogs.search')}
    />
  );
}
