import { MenuItem, TextField } from '@mui/material';
import { useTranslation } from '../../i18n/useTranslation';

interface Props {
  label: string;
  devices: MediaDeviceInfo[];
  value: string;
  onChange: (id: string) => void;
}

/**
 * One device list.
 *
 * A device with no label is numbered rather than shown as an empty row — that
 * is the state before any permission has been granted, and an empty dropdown
 * looks like "you have no microphone" when it means "we have not asked yet".
 */
export default function DevicePicker({ label, devices, value, onChange }: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <TextField
      select
      fullWidth
      size="small"
      label={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      <MenuItem value="">{t('shell.chat.devices.systemDefault')}</MenuItem>
      {devices.map((device, index) => (
        <MenuItem key={device.deviceId || `device-${index}`} value={device.deviceId}>
          {device.label || t('shell.chat.devices.device', { vars: { index: String(index + 1) } })}
        </MenuItem>
      ))}
    </TextField>
  );
}
