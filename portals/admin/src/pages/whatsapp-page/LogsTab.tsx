import { useMemo } from 'react';
import { useApolloClient } from '@apollo/client';
import { DuncitTable, useApolloTableFetch } from '@duncit/table';
import { useDateFormat, useTranslation } from '@duncit/app-settings';
import { getLogColumns } from './logColumns';
import { WHATSAPP_MESSAGE_LOGS, type WaMessageLogRow } from './queries';

const getRowId = (row: WaMessageLogRow) => row.id;

/**
 * Every send attempt, newest first. The reason column is the whole point: it is
 * where "the switch is on but they got nothing" is answered.
 */
export default function LogsTab() {
  const { t } = useTranslation();
  const { formatDateTime } = useDateFormat();
  const client = useApolloClient();

  const fetchRows = useApolloTableFetch<WaMessageLogRow>(
    client,
    WHATSAPP_MESSAGE_LOGS,
    'whatsappMessageLogs'
  );

  const columns = useMemo(() => {
    const statusLabels = {
      SENDING: t('adminWhatsapp.statusSending'),
      SENT: t('adminWhatsapp.statusSent'),
      SKIPPED: t('adminWhatsapp.statusSkipped'),
      FAILED: t('adminWhatsapp.statusFailed'),
    };
    return getLogColumns({ t, formatDateTime, statusLabels });
  }, [t, formatDateTime]);

  return (
    <DuncitTable<WaMessageLogRow>
      tableId="admin-whatsapp-logs"
      columns={columns}
      fetchRows={fetchRows}
      getRowId={getRowId}
      emptyText={t('adminWhatsapp.logsEmpty')}
      defaultSort={{ field: 'created_at', dir: 'desc' }}
      searchPlaceholder={t('adminWhatsapp.logsSearch')}
    />
  );
}
