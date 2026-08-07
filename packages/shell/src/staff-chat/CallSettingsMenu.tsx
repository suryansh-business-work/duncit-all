import { useState } from 'react';
import { IconButton, Tooltip } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
import { useTranslation } from '../i18n/useTranslation';
import DeviceSettingsDialog from './devices/DeviceSettingsDialog';

interface Props {
  micId: string;
  camId: string;
  onMic: (id: string) => void;
  onCam: (id: string) => void;
  /** Hide the camera on an audio call — there is nothing it would change. */
  showCamera: boolean;
}

/**
 * The way in to audio and video settings.
 *
 * It opens a dialog rather than a dropdown, because picking a device and
 * testing it is one job: a menu can list microphones but it cannot show you a
 * level meter or your own picture, and a list of names does not answer "will
 * they hear me".
 */
export default function CallSettingsMenu({
  micId,
  camId,
  onMic,
  onCam,
  showCamera,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Tooltip title={t('shell.chat.call.settings')}>
        <IconButton
          size="small"
          color="inherit"
          aria-label={t('shell.chat.call.settingsLabel')}
          onClick={() => setOpen(true)}
        >
          <SettingsIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <DeviceSettingsDialog
        open={open}
        micId={micId}
        camId={camId}
        onMic={onMic}
        onCam={onCam}
        showCamera={showCamera}
        onClose={() => setOpen(false)}
      />
    </>
  );
}
