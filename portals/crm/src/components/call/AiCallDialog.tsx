import { useState } from 'react';
import { useMutation, useQuery } from '@apollo/client/react';
import {
  Alert,
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
import { DuncitButton } from '@duncit/buttons';
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
import { parseApiError } from '@duncit/utils';
import { callStatusView } from './callStatusView';
import CallStage from './CallStage';
import { useTranslation } from '@duncit/shell';
import type { CallLead } from '../call-window/callSession.types';
import TwilioSetupNotice from '../call-window/TwilioSetupNotice';

export type AiCallLead = CallLead;

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
  const { t } = useTranslation();
  const [promptId, setPromptId] = useState('');
  const [voice, setVoice] = useState('');
  const [logId, setLogId] = useState<string | null>(null);
  const [status, setStatus] = useState<CallStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notConfigured, setNotConfigured] = useState(false);

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
    setNotConfigured(false);
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
          entity_type: lead.entityType,
          id: lead.entityId,
          contact_number: lead.to,
          prompt_id: promptId,
          voice: voice || null,
          contact_name: lead.contactName ?? null,
        },
      });
      const payload = res.data?.startCrmAiCall;
      if (!payload?.ok) {
        setNotConfigured(payload?.code === 'TWILIO_NOT_CONFIGURED');
        setError(payload?.message ?? t('crm.call.callFailed'));
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
        <Stack direction="row" spacing={1} sx={{
          alignItems: "center"
        }}>
          <SmartToyIcon color="primary" />
          <span>AI Call · {lead?.displayName ?? ''}</span>
        </Stack>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={1.5} sx={{ mt: 0.5 }}>
          {notConfigured ? <TwilioSetupNotice /> : error && <Alert severity="error">{error}</Alert>}
          {placed ? (
            <CallStage
              fromNumber={fromNumber}
              toNumber={lead?.to ?? ''}
              statusLabel={t(callStatusView(status ?? 'INITIATED').labelKey)}
              tone={callStatusView(status ?? 'INITIATED').tone}
              active={!ended}
              ai
            />
          ) : (
            <>
              <Typography variant="body2" sx={{
                color: "text.secondary"
              }}>
                The AI agent will call the customer and converse using the selected Static Content.
              </Typography>
              <TextField
                select
                size="small"
                label={t('crm.components.staticContentPrompt')}
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
                label={t('crm.components.servamVoice')}
                value={voice}
                onChange={(e) => setVoice(e.target.value)}
                helperText={t('crm.components.voiceTheAiAgentSpeaksIn')}
                fullWidth
              >
                {SERVAM_VOICES.map((v) => (
                  <MenuItem key={v.value || 'default'} value={v.value}>
                    {v.label}
                  </MenuItem>
                ))}
              </TextField>
            </>
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        <DuncitButton onClick={handleClose}>{ended ? t('shell.common.close') : t('shell.common.cancel')}</DuncitButton>
        {!placed && (
          <DuncitButton variant="contained" onClick={placeCall} disabled={!promptId || starting}>
            {starting ? 'Placing…' : 'Start AI call'}
          </DuncitButton>
        )}
      </DialogActions>
    </Dialog>
  );
}
