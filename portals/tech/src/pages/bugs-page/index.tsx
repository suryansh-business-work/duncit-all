import { useCallback } from 'react';
import { useNavigate } from 'react-router';
import { useApolloClient } from '@apollo/client/react';
import { Box, Stack, Typography } from '@mui/material';
import { useApolloTableFetch } from '@duncit/table';
import { useUserData } from '@duncit/user-context';
import { SUPER_ROLE } from '../../lib/session';
import {
  TelemetryBulkBar,
  TelemetryDeleteButton,
  useTelemetryTableSelection,
} from '../../components/telemetry-delete';
import { BUGS_TABLE, type BugRow } from './queries';
import BugsTable from './BugsTable';
import { useDeleteSingleBug } from './useDeleteSingleBug';
import BugImportExport from './BugImportExport';

const bugId = (bug: BugRow) => bug.id;

export default function BugsPage() {
  const client = useApolloClient();
  const navigate = useNavigate();
  const { user } = useUserData();
  const bulk = useTelemetryTableSelection<BugRow>(bugId);

  const fetchRows = useApolloTableFetch<BugRow>(client, BUGS_TABLE, 'bugsTable');
  const deleteOne = useDeleteSingleBug(bulk.afterDelete);

  // Triage happens at the bug's own address, not in a dialog over the table —
  // so it survives a reload and can be pasted to whoever has to fix it.
  const openBug = useCallback((bug: BugRow) => navigate(`/telemetry/bugs/${bug.id}`), [navigate]);

  // An unscoped delete is SUPER_ADMIN-only on the server, so the dialog says so
  // rather than letting a click end in Access Denied.
  const isSuperAdmin = user?.roles?.includes(SUPER_ROLE) ?? false;
  const toolbarActions = (
    <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
      <BugImportExport onImported={bulk.refetch} />
      <TelemetryDeleteButton
        target="BUGS"
        view={bulk.view}
        canDeleteEverything={isSuperAdmin}
        onDeleted={bulk.afterDelete}
      />
    </Stack>
  );

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h5">Bugs</Typography>
        <Typography variant="body2" sx={{
          color: "text.secondary"
        }}>
          Error logs rolled up by page + platform, with occurrence counts and per-environment
          breakdowns. Open one to triage it, or select rows to delete them.
        </Typography>
      </Box>

      <TelemetryBulkBar
        target="BUGS"
        selectedIds={bulk.selectedIds}
        view={bulk.view}
        onClear={bulk.clear}
        onDeleted={bulk.afterDelete}
      />

      <BugsTable
        fetchRows={fetchRows}
        refetchRef={bulk.refetchRef}
        onOpen={openBug}
        onDelete={deleteOne}
        selection={bulk.selection}
        onQueryChange={bulk.onQueryChange}
        toolbarActions={toolbarActions}
      />
    </Stack>
  );
}
