import { useCallback, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApolloClient } from '@apollo/client/react';
import { Box, Stack, Typography } from '@mui/material';
import { useApolloTableFetch } from '@duncit/table';
import { useUserData } from '@duncit/user-context';
import { SUPER_ROLE } from '../../lib/session';
import { BUGS_TABLE, type BugRow } from './queries';
import BugsTable from './BugsTable';
import BugBulkBar, { BugDeleteAllButton, useDeleteSingleBug } from './BugBulkBar';
import BugImportExport from './BugImportExport';

export default function BugsPage() {
  const client = useApolloClient();
  const navigate = useNavigate();
  const refetchRef = useRef<(() => void) | null>(null);
  const clearSelectionRef = useRef<(() => void) | null>(null);
  const [ticked, setTicked] = useState<BugRow[]>([]);
  const { user } = useUserData();

  const fetchRows = useApolloTableFetch<BugRow>(client, BUGS_TABLE, 'bugsTable');

  // A fresh object each render would make the grid reconfigure selection mid-tick.
  const selection = useMemo(() => ({ onChange: setTicked, clearRef: clearSelectionRef }), []);
  // Clearing goes through the grid; it echoes the empty selection back to `ticked`.
  const clearSelection = useCallback(() => clearSelectionRef.current?.(), []);

  const afterDelete = useCallback(() => {
    clearSelectionRef.current?.();
    refetchRef.current?.();
  }, []);
  const refetch = useCallback(() => refetchRef.current?.(), []);

  const deleteOne = useDeleteSingleBug(afterDelete);

  // Triage happens at the bug's own address, not in a dialog over the table —
  // so it survives a reload and can be pasted to whoever has to fix it.
  const openBug = useCallback((bug: BugRow) => navigate(`/telemetry/bugs/${bug.id}`), [navigate]);

  // deleteAllBugs is SUPER_ADMIN-only on the server, so the button is not shown
  // to an account whose click could only end in Access Denied.
  const isSuperAdmin = user?.roles?.includes(SUPER_ROLE) ?? false;
  const toolbarActions = (
    <Stack direction="row" spacing={0.5} sx={{
      alignItems: "center"
    }}>
      <BugImportExport onImported={refetch} />
      {isSuperAdmin ? <BugDeleteAllButton onDeleted={afterDelete} /> : null}
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

      <BugBulkBar selected={ticked} onClear={clearSelection} onDeleted={afterDelete} />

      <BugsTable
        fetchRows={fetchRows}
        refetchRef={refetchRef}
        onOpen={openBug}
        onDelete={deleteOne}
        selection={selection}
        toolbarActions={toolbarActions}
      />
    </Stack>
  );
}
