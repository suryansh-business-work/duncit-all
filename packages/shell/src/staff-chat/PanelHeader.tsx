import { IconButton, Stack, Tooltip, Typography } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import { useTranslation } from '../i18n/useTranslation';
import ChatSettingsMenu from './ChatSettingsMenu';
import StatusMenu from './StatusMenu';
import type { ChatSettings } from './useChatSettings';
import type { PresenceStatus } from './usePresence';

interface Props {
  settings: ChatSettings;
  onSettings: <K extends keyof ChatSettings>(key: K, value: ChatSettings[K]) => void;
  status: PresenceStatus;
  onStatus: (status: PresenceStatus) => void;
  /** True while a recording is still uploading or converting — a note, not a lock. */
  busy: boolean;
  onClose: () => void;
  /** The settings popover is opened from here AND from a conversation. */
  settingsOpen: boolean;
  onOpenSettings: () => void;
  onCloseSettings: () => void;
}

/** The panel's own top bar — settings, your status, and the way out. */
export default function PanelHeader({
  settings,
  onSettings,
  status,
  onStatus,
  busy,
  onClose,
  settingsOpen,
  onOpenSettings,
  onCloseSettings,
}: Readonly<Props>) {
  const { t } = useTranslation();

  return (
    <Stack direction="row" alignItems="center" spacing={1} sx={{ px: 1.5, pt: 1.5, pb: 1 }}>
      <Typography variant="subtitle1" sx={{ flex: 1 }}>
        {t('shell.chat.panel.title')}
      </Typography>
      <ChatSettingsMenu
        settings={settings}
        onChange={onSettings}
        open={settingsOpen}
        onOpen={onOpenSettings}
        onClose={onCloseSettings}
      />
      <StatusMenu status={status} onChange={onStatus} />
      {/*
        Always closable.

        This used to be disabled while a recording uploaded, to stop the work
        being thrown away — but it never could be: the recorder lives in the
        panel component, and only the SIDEBAR is behind `open`. The upload runs
        on regardless, and its progress is in the call window, which is not part
        of this sidebar either.

        So the guard protected nothing and cost everything: a slow upload, or a
        conversion sitting through its five-minute poll, left the only way out
        of the panel dead under the pointer with a tooltip nobody hovers. A
        close button that does not close is the bug, whatever it was guarding.
      */}
      <Tooltip title={busy ? t('shell.chat.panel.closeBusy') : t('shell.chat.panel.close')}>
        <IconButton size="small" onClick={onClose} aria-label={t('shell.chat.panel.close')}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Stack>
  );
}
