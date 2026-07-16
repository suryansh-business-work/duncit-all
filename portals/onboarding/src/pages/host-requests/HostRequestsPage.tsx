import { useRef, useState } from 'react';
import { useApolloClient, useMutation } from '@apollo/client';
import { Alert, Box, Stack, Typography } from '@mui/material';
import { useApolloTableFetch } from '@duncit/table';
import { ConfirmDialog } from '@duncit/dialogs';
import HostRequestsTable from './HostRequestsTable';
import ContactDetailsDialog from './ContactDetailsDialog';
import DecisionDialog, { type DecisionMode } from './DecisionDialog';
import {
  ACKNOWLEDGE_HOST_REQUEST,
  APPROVE_HOST_REQUEST,
  DELETE_HOST_REQUEST,
  HOST_REQUESTS_TABLE,
  REJECT_HOST_REQUEST,
  type HostRequest,
} from './queries';

/** Onboarding → Host Requests: approved hosts applying to host in a new category. */
export default function HostRequestsPage() {
  const client = useApolloClient();
  const refetchRef = useRef<(() => void) | null>(null);
  const [acknowledge, { loading: acking }] = useMutation(ACKNOWLEDGE_HOST_REQUEST);
  const [approve, { loading: approving }] = useMutation(APPROVE_HOST_REQUEST);
  const [reject, { loading: rejecting }] = useMutation(REJECT_HOST_REQUEST);
  const [deleteRequest, { loading: deleting }] = useMutation(DELETE_HOST_REQUEST);

  const [contactFor, setContactFor] = useState<HostRequest | null>(null);
  const [decision, setDecision] = useState<{ mode: DecisionMode; request: HostRequest } | null>(null);
  const [deleteFor, setDeleteFor] = useState<HostRequest | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const busy = acking || approving || rejecting || deleting;

  const fetchRows = useApolloTableFetch<HostRequest>(client, HOST_REQUESTS_TABLE, 'hostRequestsTable');

  const run = async (work: Promise<unknown>, fallback: string) => {
    setActionError(null);
    try {
      await work;
      refetchRef.current?.();
      return true;
    } catch (e) {
      setActionError(e instanceof Error ? e.message : fallback);
      return false;
    }
  };

  const doAcknowledge = async (r: HostRequest) => {
    const ok = await run(acknowledge({ variables: { id: r.id } }), 'Could not acknowledge the request');
    if (ok) setContactFor(r);
  };
  const openDecision = (mode: DecisionMode, request: HostRequest) => {
    setContactFor(null);
    setDecision({ mode, request });
  };
  const confirmDecision = async (notes: string) => {
    if (!decision) return;
    const { mode, request } = decision;
    const work = mode === 'APPROVE'
      ? approve({ variables: { id: request.id, notes: notes || null } })
      : reject({ variables: { id: request.id, notes } });
    const ok = await run(work, 'Could not update the request');
    if (ok) setDecision(null);
  };
  const confirmDelete = async () => {
    if (!deleteFor) return;
    const ok = await run(deleteRequest({ variables: { id: deleteFor.id } }), 'Could not delete the request');
    if (ok) setDeleteFor(null);
  };

  return (
    <Box>
      <Stack spacing={0.25} mb={2}>
        <Typography variant="h5" fontWeight={700}>Host Requests</Typography>
        <Typography variant="body2" color="text.secondary">
          Review requests from approved hosts to start hosting in a new category.
        </Typography>
      </Stack>

      {actionError && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setActionError(null)}>{actionError}</Alert>}

      <HostRequestsTable
        fetchRows={fetchRows}
        refetchRef={refetchRef}
        busy={busy}
        onAcknowledge={doAcknowledge}
        onApprove={(r) => openDecision('APPROVE', r)}
        onReject={(r) => openDecision('REJECT', r)}
        onDelete={setDeleteFor}
      />

      <ContactDetailsDialog
        request={contactFor}
        onClose={() => setContactFor(null)}
        onApprove={(r) => openDecision('APPROVE', r)}
        onReject={(r) => openDecision('REJECT', r)}
      />

      <DecisionDialog
        mode={decision?.mode ?? null}
        request={decision?.request ?? null}
        busy={busy}
        onClose={() => setDecision(null)}
        onConfirm={confirmDecision}
      />

      <ConfirmDialog
        open={!!deleteFor}
        title="Delete host request"
        message={`Permanently delete request ${deleteFor?.request_no ?? ''}? This cannot be undone.`}
        confirmLabel="Delete"
        confirmColor="error"
        loading={deleting}
        busyLabel="Working…"
        onClose={() => setDeleteFor(null)}
        onConfirm={confirmDelete}
      />
    </Box>
  );
}
