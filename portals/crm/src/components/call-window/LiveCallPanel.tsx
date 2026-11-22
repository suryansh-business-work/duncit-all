import { useQuery } from '@apollo/client/react';
import { Alert, Box, Chip, Divider, Stack, Typography } from '@mui/material';
import TimerIcon from '@mui/icons-material/Timer';
import ReplayIcon from '@mui/icons-material/Replay';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '@duncit/shell';
import { fireAndForget, logs } from '@duncit/logs';
import { CRM_CALL_SETUP, type CallSetup } from '../../api/call.gql';
import { useCallSocketConnected } from '../../hooks/useCallSocket';
import { callStatusView } from '../call/callStatusView';
import CallStage from '../call/CallStage';
import CallControls from './CallControls';
import CallTranscriptPanel from './CallTranscriptPanel';
import { formatDuration, useCallClock } from './useCallClock';
import type { CallSession } from './useCallSession';

/**
 * During and after the call: status, duration, connection state, Mute / Hold
 * / End, and the transcript. Once it ends, where everything was saved and a
 * Call again button.
 */
export default function LiveCallPanel({ session }: Readonly<{ session: CallSession }>) {
  const { t } = useTranslation();
  const { data } = useQuery<{ crmCallSetup: CallSetup }>(CRM_CALL_SETUP, { fetchPolicy: 'cache-first' });
  const setup = data?.crmCallSetup;
  const connectedLive = useCallSocketConnected();
  const connected = session.status === 'IN_PROGRESS';
  const seconds = useCallClock(session.answeredAt, session.live);
  const view = callStatusView(session.status, session.onHold);

  const control = (action: Parameters<CallSession['control']>[0]) =>
    fireAndForget(session.control(action), logs.portal.crm, 'LiveCallPanel', action);

  return (
    <Stack spacing={2}>
      {session.error && <Alert severity="error">{session.error}</Alert>}
      {session.live && !connectedLive && (
        <Alert severity="info" data-testid="call-connection-lost">
          {t('crm.call.connectionLost')}
        </Alert>
      )}
      <CallStage
        fromNumber={setup?.from_number ?? ''}
        toNumber={session.lead?.to ?? ''}
        statusLabel={t(view.labelKey)}
        tone={view.tone}
        active={session.live}
      />
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', justifyContent: 'center' }}>
        <Chip icon={<TimerIcon />} label={`${t('crm.call.duration')} ${formatDuration(seconds)}`} data-testid="call-duration" />
      </Stack>
      {session.live ? (
        <CallControls muted={session.muted} onHold={session.onHold} connected={connected} busy={session.busy} onControl={control} />
      ) : (
        <Stack spacing={1}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {t('crm.call.endedNote')}
          </Typography>
          <Box>
            <DuncitButton variant="outlined" startIcon={<ReplayIcon />} onClick={() => fireAndForget(session.start(), logs.portal.crm, 'LiveCallPanel', 'callAgain')}>
              {t('crm.call.callAgain')}
            </DuncitButton>
          </Box>
        </Stack>
      )}
      <Divider />
      <CallTranscriptPanel segments={session.segments} enabled={setup?.live_transcription ?? true} />
    </Stack>
  );
}
