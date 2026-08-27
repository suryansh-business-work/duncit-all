import { useEffect, useRef } from 'react';
import { Alert, Box, Dialog, DialogActions, DialogContent, DialogTitle, LinearProgress, Stack, Typography } from '@mui/material';
import { DuncitButton } from '@duncit/buttons';
import { useTranslation } from '../../i18n/useTranslation';
import DevicePicker from './DevicePicker';
import { useDeviceTest } from './useDeviceTest';

interface Props {
  open: boolean;
  micId: string;
  camId: string;
  onMic: (id: string) => void;
  onCam: (id: string) => void;
  /** Hide the camera on an audio call — there is nothing it would change. */
  showCamera: boolean;
  onClose: () => void;
}

/**
 * Pick a microphone and camera, and prove they work.
 *
 * A dropdown of device names cannot answer the only question worth asking
 * before a call, which is "will they hear me". So the choice and the test live
 * together: press Test, watch the bar move and see your own picture. Muted in
 * the operating system, a camera another app is holding, the wrong microphone
 * selected — all of it shows here instead of thirty seconds into a call.
 */
export default function DeviceSettingsDialog({
  open,
  micId,
  camId,
  onMic,
  onCam,
  showCamera,
  onClose,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const { devices, stream, level, error, start, stop, testing } = useDeviceTest(micId, camId, open);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream;
  }, [stream]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{t('shell.chat.devices.title')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 0.5 }}>
          {error && <Alert severity="error">{error}</Alert>}

          <DevicePicker label={t('shell.chat.devices.microphone')} devices={devices.mics} value={micId} onChange={onMic} />

          <Box>
            <Typography variant="caption" sx={{
              color: "text.secondary"
            }}>
              {t('shell.chat.devices.inputLevel')}
            </Typography>
            <LinearProgress
              variant="determinate"
              value={level}
              sx={{ height: 8, borderRadius: 1, mt: 0.5 }}
            />
            <Typography variant="caption" sx={{
              color: "text.secondary"
            }}>
              {t(testing ? 'shell.chat.devices.saySomething' : 'shell.chat.devices.pressTest')}
            </Typography>
          </Box>

          {showCamera && (
            <DevicePicker label={t('shell.chat.devices.camera')} devices={devices.cams} value={camId} onChange={onCam} />
          )}

          {showCamera && (
            <Box
              component="video"
              ref={videoRef}
              autoPlay
              playsInline
              muted
              sx={{ width: '100%', borderRadius: 1, bgcolor: 'common.black', minHeight: 120 }}
            />
          )}
        </Stack>
      </DialogContent>
      <DialogActions>
        {testing ? (
          <DuncitButton onClick={stop}>{t('shell.chat.devices.stopTest')}</DuncitButton>
        ) : (
          <DuncitButton onClick={() => start(showCamera).catch(() => undefined)}>{t('shell.chat.devices.test')}</DuncitButton>
        )}
        <DuncitButton variant="contained" onClick={onClose}>
          {t('shell.chat.devices.done')}
        </DuncitButton>
      </DialogActions>
    </Dialog>
  );
}
