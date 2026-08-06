import { useEffect, useRef } from 'react';
import { Alert, Avatar, Box, Button, Paper, Stack, Typography } from '@mui/material';
import CallEndIcon from '@mui/icons-material/CallEnd';
import CallIcon from '@mui/icons-material/Call';
import type { Coworker } from './queries';
import type { CallKind, CallPhase } from './useCall';

interface Props {
  phase: CallPhase;
  kind: CallKind;
  peer: Coworker | null;
  error: string | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  onAnswer: () => void;
  onDecline: () => void;
  onHangUp: () => void;
}

/** Video elements take a stream through a property, not an attribute. */
function Video({ stream, muted }: Readonly<{ stream: MediaStream | null; muted?: boolean }>) {
  const ref = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream;
  }, [stream]);
  return (
    <Box
      component="video"
      ref={ref}
      autoPlay
      playsInline
      muted={muted}
      sx={{ width: '100%', borderRadius: 1, bgcolor: 'common.black' }}
    />
  );
}

const LABEL: Record<CallPhase, string> = {
  idle: '',
  ringing: 'Ringing…',
  incoming: 'is calling',
  connected: 'Connected',
};

/**
 * The call, above the conversation it belongs to.
 *
 * In the same panel rather than a dialog: hanging up should not cost you the
 * thread you were talking about, and a call window that covers the chat is a
 * call you cannot take notes during.
 */
export default function CallPanel({
  phase,
  kind,
  peer,
  error,
  localStream,
  remoteStream,
  onAnswer,
  onDecline,
  onHangUp,
}: Readonly<Props>) {
  if (phase === 'idle' && !error) return null;

  return (
    <Paper variant="outlined" sx={{ m: 1, p: 1.5 }}>
      {error && (
        <Alert severity="error" sx={{ mb: 1 }}>
          {error}
        </Alert>
      )}

      {phase !== 'idle' && (
        <Stack spacing={1}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Avatar src={peer?.photo || undefined} sx={{ width: 32, height: 32 }} />
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography variant="subtitle2" noWrap>
                {peer?.name ?? 'Coworker'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {kind === 'VIDEO' ? 'Video' : 'Audio'} · {LABEL[phase]}
              </Typography>
            </Box>
          </Stack>

          {kind === 'VIDEO' && phase === 'connected' && (
            <Stack spacing={0.5}>
              <Video stream={remoteStream} />
              {/* Muted on purpose: hearing your own microphone is feedback. */}
              <Box sx={{ width: '40%' }}>
                <Video stream={localStream} muted />
              </Box>
            </Stack>
          )}

          <Stack direction="row" spacing={1}>
            {phase === 'incoming' ? (
              <>
                <Button
                  size="small"
                  variant="contained"
                  color="success"
                  startIcon={<CallIcon />}
                  onClick={onAnswer}
                >
                  Answer
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  color="error"
                  startIcon={<CallEndIcon />}
                  onClick={onDecline}
                >
                  Decline
                </Button>
              </>
            ) : (
              <Button
                size="small"
                variant="contained"
                color="error"
                startIcon={<CallEndIcon />}
                onClick={onHangUp}
              >
                {phase === 'ringing' ? 'Cancel' : 'Hang up'}
              </Button>
            )}
          </Stack>
        </Stack>
      )}
    </Paper>
  );
}
