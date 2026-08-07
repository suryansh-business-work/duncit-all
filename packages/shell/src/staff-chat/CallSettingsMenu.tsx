import { useEffect, useState } from 'react';
import { IconButton, ListSubheader, Menu, MenuItem, Tooltip } from '@mui/material';
import SettingsIcon from '@mui/icons-material/Settings';

interface Props {
  micId: string;
  camId: string;
  onMic: (id: string) => void;
  onCam: (id: string) => void;
  /** Hide the camera list on an audio call — there is nothing it would change. */
  showCamera: boolean;
}

/**
 * Which microphone and camera the call uses.
 *
 * The list is only read while the menu is open. Labels are blank until a
 * permission has been granted at least once — a browser will not tell a page
 * the name of a device it has never been allowed to open — so a device with no
 * label is numbered rather than shown as an empty row.
 */
export default function CallSettingsMenu({
  micId,
  camId,
  onMic,
  onCam,
  showCamera,
}: Readonly<Props>) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [mics, setMics] = useState<MediaDeviceInfo[]>([]);
  const [cams, setCams] = useState<MediaDeviceInfo[]>([]);

  useEffect(() => {
    if (!anchor) return;
    let live = true;
    globalThis.navigator.mediaDevices
      ?.enumerateDevices()
      .then((devices) => {
        if (!live) return;
        setMics(devices.filter((d) => d.kind === 'audioinput'));
        setCams(devices.filter((d) => d.kind === 'videoinput'));
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [anchor]);

  const row = (device: MediaDeviceInfo, index: number, selected: string, pick: (id: string) => void) => (
    <MenuItem
      key={device.deviceId || `device-${index}`}
      selected={selected === device.deviceId}
      onClick={() => {
        pick(device.deviceId);
        setAnchor(null);
      }}
    >
      {device.label || `Device ${index + 1}`}
    </MenuItem>
  );

  return (
    <>
      <Tooltip title="Audio & video settings">
        <IconButton size="small" color="inherit" aria-label="Audio and video settings" onClick={(e) => setAnchor(e.currentTarget)}>
          <SettingsIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={() => setAnchor(null)}>
        <ListSubheader>Microphone</ListSubheader>
        <MenuItem
          selected={micId === ''}
          onClick={() => {
            onMic('');
            setAnchor(null);
          }}
        >
          System default
        </MenuItem>
        {mics.map((device, index) => row(device, index, micId, onMic))}

        {showCamera && <ListSubheader>Camera</ListSubheader>}
        {showCamera && (
          <MenuItem
            selected={camId === ''}
            onClick={() => {
              onCam('');
              setAnchor(null);
            }}
          >
            System default
          </MenuItem>
        )}
        {showCamera && cams.map((device, index) => row(device, index, camId, onCam))}
      </Menu>
    </>
  );
}
