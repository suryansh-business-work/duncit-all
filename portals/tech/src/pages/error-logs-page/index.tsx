import { useState } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { Box, Stack, Typography } from '@mui/material';
import { useApolloTableFetch } from '@duncit/table';
import { useUserData } from '@duncit/user-context';
import { useTranslation } from '@duncit/app-settings';
import { SUPER_ROLE } from '../../lib/session';
import {
  TelemetryBulkBar,
  TelemetryDeleteButton,
  useTelemetryTableSelection,
} from '../../components/telemetry-delete';
import ErrorLogsTable from './ErrorLogsTable';
import ErrorLogDetailDialog from './ErrorLogDetailDialog';
import { ERROR_LOGS_TABLE, type ErrorLogRow } from './queries';

const rowId = (row: ErrorLogRow) => row.id;

/**
 * Error Logs — every server-operation failure the shared error module caught,
 * across the portals, mWeb and the native app, with the parsed GraphQL detail
 * (kind, code, operation, path) each row carried in with it.
 *
 * Its rows ARE telemetry logs, pinned to the module's marker, so the bulk
 * delete here is the same one the Telemetry Logs page uses — and the pinned
 * marker rides along in the scope, keeping a delete inside this section.
 */
export default function ErrorLogsPage() {
  const { t } = useTranslation();
  const client = useApolloClient();
  const { user } = useUserData();
  const [selected, setSelected] = useState<ErrorLogRow | null>(null);
  const bulk = useTelemetryTableSelection<ErrorLogRow>(rowId);
  const fetchRows = useApolloTableFetch<ErrorLogRow>(client, ERROR_LOGS_TABLE, 'telemetryLogsTable');
  const isSuperAdmin = user?.roles?.includes(SUPER_ROLE) ?? false;

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h5">{t('shell.nav.errorLogs')}</Typography>
        <Typography variant="body2" sx={{
          color: "text.secondary"
        }}>
          Server-operation failures caught by the shared error module on every surface — parsed
          GraphQL code, operation and path included. Rows follow the telemetry retention window.
        </Typography>
      </Box>

      <TelemetryBulkBar
        target="LOGS"
        selectedIds={bulk.selectedIds}
        view={bulk.view}
        onClear={bulk.clear}
        onDeleted={bulk.afterDelete}
      />

      <ErrorLogsTable
        fetchRows={fetchRows}
        refetchRef={bulk.refetchRef}
        onOpen={setSelected}
        selection={bulk.selection}
        onQueryChange={bulk.onQueryChange}
        toolbarActions={
          <TelemetryDeleteButton
            target="LOGS"
            view={bulk.view}
            canDeleteEverything={isSuperAdmin}
            onDeleted={bulk.afterDelete}
          />
        }
      />
      <ErrorLogDetailDialog row={selected} onClose={() => setSelected(null)} />
    </Stack>
  );
}
