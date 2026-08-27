import { Box, Stack } from '@mui/material';
import CallIcon from '@mui/icons-material/Call';
import CallEndIcon from '@mui/icons-material/CallEnd';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '../../i18n/useTranslation';
import CallSettingsMenu from '../CallSettingsMenu';
import LiveControls, { type LiveControlsProps } from './LiveControls';
import type { CallKind, CallPhase } from '../useCall';

export type CallControlsProps = Omit<LiveControlsProps, 'video'> & {
  phase: CallPhase;
  kind: CallKind;
  micId: string;
  camId: string;
  onAnswer: () => void;
  onDecline: () => void;
  onHangUp: () => void;
  onMic: (id: string) => void;
  onCam: (id: string) => void;
};

/**
 * The row you press things on.
 *
 * Answer/decline while it is ringing, everything else once it is up. Split out
 * of the panel because a call panel that also holds nine controls is one
 * component doing the whole feature.
 */
export default function CallControls({
  phase,
  kind,
  micId,
  camId,
  onAnswer,
  onDecline,
  onHangUp,
  onMic,
  onCam,
  ...live
}: Readonly<CallControlsProps>) {
  const { t } = useTranslation();
  const connected = phase === 'connected';
  const video = kind === 'VIDEO';
  const hangUpLabel = t(phase === 'ringing' ? 'shell.chat.call.cancel' : 'shell.chat.call.hangUp');

  return (
    <Stack direction="row" spacing={1} sx={{
      alignItems: "center"
    }}>
      {phase === 'incoming' ? (
        <>
          <DuncitButton
            size="small"
            variant="contained"
            color="success"
            startIcon={<CallIcon />}
            onClick={onAnswer}
          >
            {t('shell.chat.call.answer')}
          </DuncitButton>
          <DuncitButton
            size="small"
            variant="outlined"
            color="error"
            startIcon={<CallEndIcon />}
            onClick={onDecline}
          >
            {t('shell.chat.call.decline')}
          </DuncitButton>
        </>
      ) : (
        <DuncitButton
          size="small"
          variant="contained"
          color="error"
          startIcon={<CallEndIcon />}
          onClick={onHangUp}
        >
          {hangUpLabel}
        </DuncitButton>
      )}

      {connected && <LiveControls video={video} {...live} />}

      <Box sx={{ flex: 1 }} />
      <CallSettingsMenu micId={micId} camId={camId} onMic={onMic} onCam={onCam} showCamera={video} />
    </Stack>
  );
}
