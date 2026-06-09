import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client';
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import {
  CRM_CALL_PROMPTS,
  CRM_CALL_FROM_NUMBER,
  START_CRM_AI_CALL,
  type CrmCallPrompt,
  type CrmAiCallResult,
} from '../../api/call.gql';
import { SERVAM_VOICES } from '../../config/servam-voices';
import { useCallSocket } from '../../hooks/useCallSocket';
import { useCallReconcile } from '../../hooks/useCallReconcile';
import { isTerminalCallStatus, type CallStatus } from '../../lib/callSocket';
import { parseApiError } from '../../utils/parseApiError';
import { callStatusView } from './callStatusView';
import CallStage from './CallStage';

export interface AiCallLead {
  to: string;
  entityType: 'VENUE_LEAD' | 'HOST_LEAD';
  entityId: string;
  displayName: string;
  contactName?: string;
}

interface Props {
  open: boolean;
  lead: AiCallLead | null;
  onClose: () => void;
}

/**
 * "AI Call" — the agent picks a Static Content prompt; the server places a
 * Servam-driven AI call to the customer. Live call status streams back over the
 * socket so the dialog reflects RINGING → IN_PROGRESS → call over in real time.
 */
export default function AiCallDialog({ open, lead, onClose }: Readonly<Props>) {
  const [promptId, setPromptId] = useState('');
  const [voice, setVoice] = useState('');
  const [logId, setLogId] = useState<string | null>(null);
  const [status, setStatus] = useState<CallStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { data, loading } = useQuery<{ crmCallPrompts: CrmCallPrompt[] }>(CRM_CALL_PROMPTS, {
    variables: { filter: { is_active: true } },
    skip: !open,
    fetchPolicy: 'cache-and-network',
  });
  const prompts = data?.crmCallPrompts ?? [];
  const { data: fromData } = useQuery<{ crmCallFromNumber: string | null }>(CRM_CALL_FROM_NUMBER, {
    skip: !open,
    fetchPolicy: 'cache-first',
  });
  const fromNumber = fromData?.crmCallFromNumber ?? '';

  const [start, { loading: starting }] = useMutation<{ startCrmAiCall: CrmAiCallResult }>(START_CRM_AI_CALL);

  useCallSocket((payload) => {
    if (logId && payload.log_id === logId) setStatus(payload.status);
  });
  useCallReconcile(status && isTerminalCallStatus(status) ? null : logId, setStatus);

  const reset = () => {
    setPromptId('');
    setVoice('');
    setLogId(null);
    setStatus(null);
    setError(null);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const placeCall = async () => {
    if (!lead || !promptId) return;
    setError(null);
    try {
      const res = await start({
        variables: {
          entity: lead.entityType,
          id: lead.entityId,
          contact_number: lead.to,
          prompt_id: promptId,
          voice: voice || null,
          contact_name: lead.contactName ?? null,
        },
      });
      const payload = res.data?.startCrmAiCall;
      if (!payload?.ok) {
        setError(payload?.message ?? 'Could not place the AI call.');
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

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="center" spacing={1}>
          <SmartToyIcon color="primary" />
          <span>AI Call · {lead?.displayName ?? ''}</span>
        </Stack>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={1.5} sx={{ mt: 0.5 }}>
          {error && <Alert severity="error">{error}</Alert>}
          {!placed ? (
            <>
              <Typography variant="body2" color="text.secondary">
                The AI agent will call the customer and converse using the selected Static Content.
              </Typography>
              <TextField
                select
                size="small"
                label="Static Content prompt"
                value={promptId}
                onChange={(e) => setPromptId(e.target.value)}
                disabled={loading}
                helperText={!loading && prompts.length === 0 ? 'No active prompts — add one under AI Call Prompts.' : ' '}
                fullWidth
              >
                {prompts.map((p) => (
                  <MenuItem key={p.id} value={p.id}>
                    {p.name}
                    {p.language && p.language !== 'auto' ? ` · ${p.language}` : ''}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                select
                size="small"
                label="Servam voice"
                value={voice}
                onChange={(e) => setVoice(e.target.value)}
                helperText="Voice the AI agent speaks in"
                fullWidth
              >
                {SERVAM_VOICES.map((v) => (
                  <MenuItem key={v.value || 'default'} value={v.value}>
                    {v.label}
                  </MenuItem>
                ))}
              </TextField>
            </>
          ) : (
            <CallStage
              fromNumber={fromNumber}
              toNumber={lead?.to ?? ''}
              statusLabel={callStatusView(status ?? 'INITIATED').label}
              tone={callStatusView(status ?? 'INITIATED').tone}
              active={!ended}
              ai
            />
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>{ended ? 'Close' : 'Cancel'}</Button>
        {!placed && (
          <Button variant="contained" onClick={placeCall} disabled={!promptId || starting}>
            {starting ? 'Placing…' : 'Start AI call'}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
