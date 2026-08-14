import { useCallback, useMemo, useRef, useState } from 'react';
import { useApolloClient, useMutation } from '@apollo/client';
import { Box, Snackbar, Stack, Typography } from '@mui/material';
import { useApolloTableFetch } from '@duncit/table';
import { notifyError } from '@duncit/dialogs';
import { useUserData } from '@duncit/user-context';
import { SUPER_ROLE } from '../../lib/session';
import { BUGS_TABLE, UPDATE_BUG_STATUS, type BugRow, type BugStatus } from './queries';
import BugsTable from './BugsTable';
import BugDetailDialog from './BugDetailDialog';
import BugBulkBar, { BugDeleteAllButton, useDeleteSingleBug } from './BugBulkBar';
import BugImportExport from './BugImportExport';

export default function BugsPage() {
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  const clearSelectionRef = useRef<(() => void) | null>(null);
  const [updateStatus] = useMutation(UPDATE_BUG_STATUS);
  const [selected, setSelected] = useState<BugRow | null>(null);
  const [ticked, setTicked] = useState<BugRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const { user } = useUserData();

  const fetchRows = useApolloTableFetch<BugRow>(client, BUGS_TABLE, 'bugsTable');

  // A fresh object each render would make the grid reconfigure selection mid-tick.
  const selection = useMemo(() => ({ onChange: setTicked, clearRef: clearSelectionRef }), []);
  // Clearing goes through the grid; it echoes the empty selection back to `ticked`.
  const clearSelection = useCallback(() => clearSelectionRef.current?.(), []);

  const afterDelete = useCallback(() => {
    setSelected(null);
    clearSelectionRef.current?.();
    refetchRef.current?.();
  }, []);
  const refetch = useCallback(() => refetchRef.current?.(), []);

  const deleteOne = useDeleteSingleBug(afterDelete);

  const changeStatus = async (bug: BugRow, status: BugStatus) => {
    setBusy(true);
    try {
      await updateStatus({ variables: { bug_id: bug.id, status } });
      setSelected({ ...bug, status });
      setToast(`Bug marked ${status.toLowerCase()}`);
      refetchRef.current?.();
    } catch (e) {
      notifyError(e instanceof Error ? e.message : 'Failed to update bug');
    } finally {
      setBusy(false);
    }
  };

  // deleteAllBugs is SUPER_ADMIN-only on the server, so the button is not shown
  // to an account whose click could only end in Access Denied.
  const isSuperAdmin = user?.roles?.includes(SUPER_ROLE) ?? false;
  const toolbarActions = (
    <Stack direction="row" spacing={0.5} alignItems="center">
      <BugImportExport onImported={refetch} />
      {isSuperAdmin ? <BugDeleteAllButton onDeleted={afterDelete} /> : null}
    </Stack>
  );

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h5">Bugs</Typography>
        <Typography variant="body2" color="text.secondary">
          Error logs rolled up by page + platform, with occurrence counts and per-environment
          breakdowns. Resolve, ignore or reopen each bug — or select rows to delete them.
        </Typography>
      </Box>

      <BugBulkBar selected={ticked} onClear={clearSelection} onDeleted={afterDelete} />

      <BugsTable
        fetchRows={fetchRows}
        refetchRef={refetchRef}
        onOpen={setSelected}
        onDelete={deleteOne}
        selection={selection}
        toolbarActions={toolbarActions}
      />

      <BugDetailDialog
        bug={selected}
        busy={busy}
        onClose={() => setSelected(null)}
        onStatus={changeStatus}
      />

      <Snackbar
        open={!!toast}
        autoHideDuration={3000}
        onClose={() => setToast(null)}
        message={toast ?? ''}
      />
    </Stack>
  );
}
