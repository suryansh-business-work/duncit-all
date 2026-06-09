import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material';
import PhoneInTalkIcon from '@mui/icons-material/PhoneInTalk';
import { START_CRM_PORTAL_CALL, CRM_CALL_FROM_NUMBER, type CrmAiCallResult } from '../../api/call.gql';
import { useCallSocket } from '../../hooks/useCallSocket';
import { useCallReconcile } from '../../hooks/useCallReconcile';
import { isTerminalCallStatus, type CallStatus } from '../../lib/callSocket';
import { parseApiError } from '../../utils/parseApiError';
import { callStatusView } from './callStatusView';
import CallStage from './CallStage';

export interface PortalCallLead {
  to: string;
  entityType: 'VENUE_LEAD' | 'HOST_LEAD';
  entityId: string;
  displayName: string;
  contactName?: string;
}

interface Props {
  open: boolean;
  lead: PortalCallLead | null;
  onClose: () => void;
}

/**
 * "Call" — Twilio rings the predefined agent number (Twilio config) and bridges
 * it to the customer's contact number (auto-filled) so the agent talks to the
 * lead. The call is placed only on Start Call. Live status streams from the
 * socket (with a reconcile poll fallback).
 */
export default function PortalCallDialog({ open, lead, onClose }: Readonly<Props>) {
  const [logId, setLogId] = useState<string | null>(null);
  const [status, setStatus] = useState<CallStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [start, { loading }] = useMutation<{ startCrmPortalCall: CrmAiCallResult }>(START_CRM_PORTAL_CALL);
  const { data: fromData } = useQuery<{ crmCallFromNumber: string | null }>(CRM_CALL_FROM_NUMBER, {
    skip: !open,
    fetchPolicy: 'cache-first',
  });
  const fromNumber = fromData?.crmCallFromNumber ?? '';

  useCallSocket((payload) => {
    if (logId && payload.log_id === logId) setStatus(payload.status);
  });
  useCallReconcile(status && isTerminalCallStatus(status) ? null : logId, setStatus);

  const reset = () => {
    setLogId(null);
    setStatus(null);
    setError(null);
  };
  const handleClose = () => {
    reset();
    onClose();
  };

  const placeCall = async () => {
    if (!lead) return;
    setError(null);
    try {
      const res = await start({
        variables: { entity: lead.entityType, id: lead.entityId, contact_number: lead.to, contact_name: lead.contactName ?? null },
      });
      const payload = res.data?.startCrmPortalCall;
      if (!payload?.ok) {
        setError(payload?.message ?? 'Could not place the call.');
        return;
      }
      setLogId(payload.log_id ?? null);
      setStatus('INITIATED');
    } catch (err) {
      setError(parseApiError(err));
    }
  };

  const placed = !!logId;
  const ended = status ? isTerminalCallStatus(status) : false;
  const view = callStatusView(placed ? status ?? 'INITIATED' : null);

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="center" spacing={1}>
          <PhoneInTalkIcon color="primary" />
          <span>Call · {lead?.displayName ?? ''}</span>
        </Stack>
      </DialogTitle>
      <DialogContent>
        {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}
        {!placed && (
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            A direct two-way call from your Twilio number to this contact.
          </Typography>
        )}
        <CallStage fromNumber={fromNumber} toNumber={lead?.to ?? ''} statusLabel={view.label} tone={view.tone} active={placed && !ended} />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>{ended ? 'Close' : 'Cancel'}</Button>
        {!placed && (
          <Button variant="contained" startIcon={<PhoneInTalkIcon />} onClick={placeCall} disabled={loading || !lead}>
            {loading ? 'Starting…' : 'Start Call'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
