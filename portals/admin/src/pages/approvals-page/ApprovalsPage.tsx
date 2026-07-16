import { useCallback, useEffect, useRef, useState } from 'react';
import { useApolloClient, useMutation } from '@apollo/client';
import { Alert, Box, Snackbar, Stack, Typography } from '@mui/material';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import { useApolloTableFetch } from '@duncit/table';
import { useDateFormat } from '@duncit/app-settings';
import { APPROVAL_REQUESTS_TABLE, APPROVE_REQUEST, DENY_REQUEST } from './queries';
import { type ApprovalRequest, type ApprovalStatus } from './helpers';
import ApprovalsToolbar from './ApprovalsToolbar';
import ApprovalsTable from './ApprovalsTable';
import ReviewDialog from './ReviewDialog';

export default function ApprovalsPage() {
  const [status, setStatus] = useState<'' | ApprovalStatus>('PENDING');
  const [active, setActive] = useState<ApprovalRequest | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [opError, setOpError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const { formatDateTime } = useDateFormat();

  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  const [approveMut] = useMutation(APPROVE_REQUEST);
  const [denyMut] = useMutation(DENY_REQUEST);

  // The status toggle lives outside the table (default PENDING), so it is pinned
  // into the query here rather than offered as a column filter.
  const fetchRows = useApolloTableFetch<ApprovalRequest>(
    client,
    APPROVAL_REQUESTS_TABLE,
    'approvalRequestsTable',
    { extraFilters: status ? [{ field: 'status', op: 'eq', value: status }] : undefined },
    [status],
  );

  const prevStatusRef = useRef(status);
  useEffect(() => {
    if (prevStatusRef.current === status) return;
    prevStatusRef.current = status;
    refetchRef.current?.();
  }, [status]);

  const openReview = useCallback((row: ApprovalRequest) => {
    setOpError(null);
    setActive(row);
  }, []);

  const finish = (message: string) => {
    setToast(message);
    setActive(null);
    refetchRef.current?.();
  };

  const handleApprove = async (id: string) => {
    setSaving(true);
    setOpError(null);
    try {
      await approveMut({ variables: { id } });
      finish('Request approved');
    } catch (e) {
      setOpError(e instanceof Error ? e.message : 'Failed to approve');
    } finally {
      setSaving(false);
    }
  };

  const handleDeny = async (id: string, notes: string) => {
    setSaving(true);
    setOpError(null);
    try {
      await denyMut({ variables: { id, notes: notes || undefined } });
      finish('Request denied');
    } catch (e) {
      setOpError(e instanceof Error ? e.message : 'Failed to deny');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Stack spacing={2}>
      <Stack direction="row" alignItems="center" spacing={1.5}>
        <FactCheckIcon color="primary" />
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Approve/Deny Requests
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Review approval requests coming in from across the portals.
          </Typography>
        </Box>
      </Stack>

      <ApprovalsToolbar status={status} onChange={setStatus} />

      <ApprovalsTable
        fetchRows={fetchRows}
        refetchRef={refetchRef}
        formatDateTime={formatDateTime}
        onReview={openReview}
      />

      <ReviewDialog
        request={active}
        saving={saving}
        error={opError}
        formatDateTime={formatDateTime}
        onClose={() => setActive(null)}
        onApprove={handleApprove}
        onDeny={handleDeny}
      />

      <Snackbar
        open={!!toast}
        autoHideDuration={3000}
        onClose={() => setToast(null)}
      >
        <Alert severity="success" onClose={() => setToast(null)} variant="filled">
          {toast}
        </Alert>
      </Snackbar>
    </Stack>
  );
}
