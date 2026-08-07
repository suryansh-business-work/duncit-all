import { forwardRef, useEffect, useRef } from 'react';
import { Box, Stack } from '@mui/material';

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

interface Props {
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
}

/**
 * The two pictures.
 *
 * Forwards a ref because this — not the whole panel — is what goes full screen:
 * the controls and the conversation behind them have no business filling a
 * monitor.
 */
const CallStage = forwardRef<HTMLDivElement, Props>(function CallStage(
  { localStream, remoteStream },
  ref
) {
  return (
    <Stack spacing={0.5} ref={ref} sx={{ bgcolor: 'common.black', borderRadius: 1 }}>
      <Video stream={remoteStream} />
      {/* Muted on purpose: hearing your own microphone is feedback. */}
      <Box sx={{ width: '40%' }}>
        <Video stream={localStream} muted />
      </Box>
    </Stack>
  );
});

export default CallStage;
