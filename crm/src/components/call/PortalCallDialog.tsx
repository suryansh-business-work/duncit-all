import { useState } from 'react';
import { useMutation } from '@apollo/client';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import PhoneInTalkIcon from '@mui/icons-material/PhoneInTalk';
import { START_CRM_PORTAL_CALL, type CrmAiCallResult } from '../../api/call.gql';
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
 * "Call Through Portal" — Twilio rings the agent's phone, then bridges to the
 * customer. The call is placed only when the agent clicks Start Call (never on
 * open). Live status streams from the socket (with a reconcile poll fallback).
 */
export default function PortalCallDialog({ open, lead, onClose }: Props) {
  const [logId, setLogId] = useState<string | null>(null);
  const [status, setStatus] = useState<CallStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [agentNumber, setAgentNumber] = useState('');
  const [start, { loading }] = useMutation<{ startCrmPortalCall: CrmAiCallResult }>(START_CRM_PORTAL_CALL);

  useCallSocket((payload) => {
    if (logId && payload.log_id === logId) setStatus(payload.status);
  });
  useCallReconcile(status && isTerminalCallStatus(status) ? null : logId, setStatus);

  const reset = () => {
    setLogId(null);
    setStatus(null);
    setError(null);
  };
  const digits = agentNumber.replace(/\D/g, '');
  const agentValid = digits.length >= 8 && !/^(\d)\1+$/.test(digits.length > 10 ? digits.slice(-10) : digits);
  const handleClose = () => {
    reset();
    onClose();
  };

  const placeCall = async () => {
    if (!lead) return;
    setError(null);
    try {
      const res = await start({
        variables: {
          entity: lead.entityType,
          id: lead.entityId,
          contact_number: lead.to,
          agent_number: agentNumber.trim() || null,
          contact_name: lead.contactName ?? null,
        },
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
          <Stack spacing={1} sx={{ mb: 1.5 }}>
            <Typography variant="body2" color="text.secondary">
              Enter your phone number — we'll ring it, then connect you to the customer.
            </Typography>
            <TextField
              size="small"
              label="Your phone (we'll ring this)"
              value={agentNumber}
              onChange={(e) => setAgentNumber(e.target.value)}
              error={!!agentNumber && !agentValid}
              helperText={agentNumber && !agentValid ? 'Enter a valid phone number, e.g. 9876543210' : 'Include country code if outside India'}
              inputProps={{ inputMode: 'tel' }}
              fullWidth
            />
          </Stack>
        )}
        <CallStage number={lead?.to ?? ''} statusLabel={view.label} tone={view.tone} active={placed && !ended} />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>{ended ? 'Close' : 'Cancel'}</Button>
        {!placed && (
          <Button variant="contained" startIcon={<PhoneInTalkIcon />} onClick={placeCall} disabled={loading || !lead || !agentValid}>
            {loading ? 'Starting…' : 'Start Call'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
