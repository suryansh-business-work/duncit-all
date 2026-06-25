import { useCallback, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import { Alert, Box, Snackbar, Stack, Typography } from '@mui/material';
import FactCheckIcon from '@mui/icons-material/FactCheck';
import { useDateFormat } from '../../utils/dateFormat';
import { APPROVAL_REQUESTS, APPROVE_REQUEST, DENY_REQUEST } from './queries';
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

  const variables = useMemo(() => ({ status: status || undefined }), [status]);
  const { data, loading, refetch } = useQuery(APPROVAL_REQUESTS, { variables });
  const [approveMut] = useMutation(APPROVE_REQUEST);
  const [denyMut] = useMutation(DENY_REQUEST);

  const items: ApprovalRequest[] = data?.approvalRequests ?? [];

  const openReview = useCallback((row: ApprovalRequest) => {
    setOpError(null);
    setActive(row);
  }, []);

  const finish = async (message: string) => {
    setToast(message);
    setActive(null);
    await refetch();
  };

  const handleApprove = async (id: string) => {
    setSaving(true);
    setOpError(null);
    try {
      await approveMut({ variables: { id } });
      await finish('Request approved');
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
      await finish('Request denied');
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
        loading={loading}
        items={items}
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
