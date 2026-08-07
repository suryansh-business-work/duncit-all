import { useState } from 'react';
import { IconButton, Tooltip } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';
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
  const [open, setOpen] = useState(false);

  return (
    <>
      <Tooltip title="Audio & video settings">
        <IconButton
          size="small"
          color="inherit"
          aria-label="Audio and video settings"
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
