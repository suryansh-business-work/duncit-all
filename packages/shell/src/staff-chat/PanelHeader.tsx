import { IconButton, Stack, Tooltip, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ChatSettingsMenu from './ChatSettingsMenu';
import StatusMenu from './StatusMenu';
import type { ChatSettings } from './useChatSettings';
import type { PresenceStatus } from './usePresence';

interface Props {
  settings: ChatSettings;
  onSettings: <K extends keyof ChatSettings>(key: K, value: ChatSettings[K]) => void;
  status: PresenceStatus;
  onStatus: (status: PresenceStatus) => void;
  /** True while a recording is still uploading or converting. */
  busy: boolean;
  onClose: () => void;
}

/** The panel's own top bar — settings, your status, and the way out. */
export default function PanelHeader({
  settings,
  onSettings,
  status,
  onStatus,
  busy,
  onClose,
}: Readonly<Props>) {
  return (
    <Stack direction="row" alignItems="center" spacing={1} sx={{ px: 1.5, pt: 1.5, pb: 1 }}>
      <Typography variant="subtitle1" sx={{ flex: 1 }}>
        Coworkers
      </Typography>
      <ChatSettingsMenu settings={settings} onChange={onSettings} />
      <StatusMenu status={status} onChange={onStatus} />
      <Tooltip title={busy ? 'Wait — the recording is still being saved' : 'Close chat'}>
        {/* A disabled button fires no events, so the tooltip needs a live
            wrapper to explain why it cannot be pressed. */}
        <span>
          <IconButton size="small" onClick={onClose} disabled={busy} aria-label="Close chat">
            <CloseIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
    </Stack>
  );
}
