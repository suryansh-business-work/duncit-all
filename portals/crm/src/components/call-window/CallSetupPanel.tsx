import { useQuery } from '@apollo/client/react';
import { Alert, Box, Chip, CircularProgress, Stack, Typography } from '@mui/material';
import PhoneInTalkIcon from '@mui/icons-material/PhoneInTalk';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import SubtitlesIcon from '@mui/icons-material/Subtitles';
import { DuncitButton } from '@duncit/buttons';
import { crmCanStartCall, parseApiError } from '@duncit/utils';
import { useTranslation } from '@duncit/shell';
import { fireAndForget, logs } from '@duncit/logs';
import { CRM_CALL_SETUP, type CallSetup } from '../../api/call.gql';
import TwilioSetupNotice from './TwilioSetupNotice';
import type { CallSession } from './useCallSession';

function NumberRow({ label, value, missing }: Readonly<{ label: string; value: string | null | undefined; missing: string }>) {
  return (
    <Box>
      <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 700 }}>
        {label}
      </Typography>
      <Typography variant="body2" sx={{ fontWeight: 700, color: value ? 'text.primary' : 'warning.main' }}>
        {value || missing}
      </Typography>
    </Box>
  );
}

/** True when everything a portal call needs is in place — shared with the CRM app. */
export const canStartCall = crmCanStartCall;

/**
 * Before the call: Call From (or "No Number Configured"), the contact's
 * number and the phone that will ring for the agent, what the call records,
 * and Start Call — which stays disabled until Twilio and both numbers are set.
 */
export default function CallSetupPanel({ session }: Readonly<{ session: CallSession }>) {
  const { t } = useTranslation();
  const { data, loading, error } = useQuery<{ crmCallSetup: CallSetup }>(CRM_CALL_SETUP, { fetchPolicy: 'cache-and-network' });
  const setup = data?.crmCallSetup;
  const notConfigured = (setup && !setup.configured) || session.errorCode === 'TWILIO_NOT_CONFIGURED';
  const ready = canStartCall(setup, session.lead?.to) && !session.starting;

  if (loading && !setup) {
    return (
      <Box sx={{ py: 4, textAlign: 'center' }}>
        <CircularProgress size={24} aria-label={t('crm.call.statusConnecting')} />
      </Box>
    );
  }

  return (
    <Stack spacing={2}>
      {error && <Alert severity="error">{parseApiError(error)}</Alert>}
      {notConfigured && <TwilioSetupNotice />}
      {session.error && !notConfigured && <Alert severity="error">{session.error}</Alert>}
      <Typography variant="body2" sx={{ color: 'text.secondary' }}>
        {t('crm.call.intro')}
      </Typography>
      <Stack spacing={1}>
        <NumberRow label={t('crm.call.fromLabel')} value={setup?.from_number} missing={t('crm.call.noNumberConfigured')} />
        <NumberRow label={t('crm.call.toLabel')} value={session.lead?.to} missing={t('crm.call.noNumberConfigured')} />
        <NumberRow label={t('crm.call.agentLabel')} value={setup?.agent_number} missing={t('crm.call.noAgentNumber')} />
      </Stack>
      {(setup?.recording_enabled || setup?.live_transcription) && (
        <Stack spacing={1}>
          <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: 'wrap' }}>
            {setup.recording_enabled && <Chip size="small" icon={<FiberManualRecordIcon />} label={t('crm.call.recordingOn')} />}
            {setup.live_transcription && <Chip size="small" icon={<SubtitlesIcon />} label={t('crm.call.transcriptionOn')} />}
          </Stack>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            {t('crm.call.consentNote')}
          </Typography>
        </Stack>
      )}
      <Box>
        <DuncitButton variant="contained" startIcon={<PhoneInTalkIcon />} onClick={() => fireAndForget(session.start(), logs.portal.crm, 'CallSetupPanel', 'start')}
          disabled={!ready}
        >
          {session.starting ? t('crm.call.starting') : t('crm.call.startCall')}
        </DuncitButton>
      </Box>
    </Stack>
  );
}
