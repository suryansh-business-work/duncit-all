import { Box, Stack, Typography } from '@mui/material';
import { useTranslation } from '@duncit/app-settings';
import { TelemetryBulkBar, TelemetryDeleteButton } from '../../components/telemetry-delete';
import { useErrorLogPage } from '../error-logs-page/useErrorLogPage';
import ErrorBoundariesTable from './ErrorBoundariesTable';
import ErrorBoundaryDetailDialog from './ErrorBoundaryDetailDialog';

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
  const { selected, setSelected, bulk, fetchRows, isSuperAdmin } = useErrorLogPage();

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
