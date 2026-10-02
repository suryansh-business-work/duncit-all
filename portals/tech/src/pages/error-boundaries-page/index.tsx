import { useState } from 'react';
import { useApolloClient } from '@apollo/client/react';
import { Box, Stack, Typography } from '@mui/material';
import { useApolloTableFetch } from '@duncit/table';
import { useUserData } from '@duncit/user-context';
import { useTranslation } from '@duncit/app-settings';
import { SUPER_ROLE } from '../../lib/session';
import { TelemetryBulkBar, TelemetryDeleteButton, useTelemetryTableSelection } from '../../components/telemetry-delete';
import { ERROR_LOGS_TABLE, type ErrorLogRow } from '../error-logs-page/queries';
import ErrorBoundariesTable from './ErrorBoundariesTable';
import ErrorBoundaryDetailDialog from './ErrorBoundaryDetailDialog';

const rowId = (row: ErrorLogRow) => row.id;

/**
 * Error Boundaries — every page or screen that crashed into an error boundary
 * on mWeb, the native app or a portal, and every Report an Issue pressed on
 * one, as bug rows.
 *
 * The rows ARE telemetry logs (the same query as Error Logs), pinned to the
 * boundary marker, so they also roll up into Telemetry → Bugs, and the bulk
 * delete here is the shared telemetry one with the marker riding in its scope.
 */
export default function ErrorBoundariesPage() {
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
        <Typography variant="h5" component="h1">
          {t('shell.nav.errorBoundaries')}
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
          {t('tech.errorBoundaries.description')}
        </Typography>
      </Box>

      <TelemetryBulkBar
        target="LOGS"
        selectedIds={bulk.selectedIds}
        view={bulk.view}
        onClear={bulk.clear}
        onDeleted={bulk.afterDelete}
      />

      <ErrorBoundariesTable
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
      <ErrorBoundaryDetailDialog row={selected} onClose={() => setSelected(null)} />
    </Stack>
  );
}
