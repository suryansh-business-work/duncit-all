import { useMemo } from 'react';
import { DuncitTable, type TableFetch } from '@duncit/table';
import { useTranslation } from '@duncit/app-settings';
import { buildLogColumns } from './columns';
import type { LogRow } from './queries';

const getRowId = (row: LogRow) => row.id;

interface Props {
  fetchRows: TableFetch<LogRow>;
  onOpen: (row: LogRow) => void;
}

/** The verification log, newest first. Search, filters, sort and paging all run on the server. */
export default function LoginVerificationsTable({ fetchRows, onOpen }: Readonly<Props>) {
  const { t } = useTranslation();
  const columns = useMemo(() => buildLogColumns(t), [t]);
  return (
    <DuncitTable<LogRow>
      ariaLabel={t('tech.loginVerifications.title')}
      tableId="tech-login-verifications"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      onRowClick={onOpen}
      emptyText={t('tech.loginVerifications.empty')}
      defaultSort={{ field: 'created_at', dir: 'desc' }}
      searchPlaceholder={t('tech.loginVerifications.searchHint')}
    />
  );
}
