import { useRef, useState } from 'react';
import { useApolloClient, useMutation } from '@apollo/client';
import { Box, Snackbar, Stack, Typography } from '@mui/material';
import { useApolloTableFetch } from '@duncit/table';
import { notifyError } from '@duncit/dialogs';
import { BUGS_TABLE, UPDATE_BUG_STATUS, type BugRow, type BugStatus } from './queries';
import BugsTable from './BugsTable';
import BugDetailDialog from './BugDetailDialog';

export default function BugsPage() {
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  const [updateStatus] = useMutation(UPDATE_BUG_STATUS);
  const [selected, setSelected] = useState<BugRow | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const fetchRows = useApolloTableFetch<BugRow>(client, BUGS_TABLE, 'bugsTable');

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

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="h5">Bugs</Typography>
        <Typography variant="body2" color="text.secondary">
          Error logs rolled up by page + platform, with occurrence counts and per-environment
          breakdowns. Resolve, ignore or reopen each bug.
        </Typography>
      </Box>

      <BugsTable fetchRows={fetchRows} refetchRef={refetchRef} onOpen={setSelected} />

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
