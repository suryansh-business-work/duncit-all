import { useId, useState } from 'react';
import { ListItemIcon, ListItemText, Menu, MenuItem, Tooltip } from '@mui/material';
import NotificationsNoneOutlinedIcon from '@mui/icons-material/NotificationsNoneOutlined';
import NotificationsOffOutlinedIcon from '@mui/icons-material/NotificationsOffOutlined';
import NotificationsActiveOutlinedIcon from '@mui/icons-material/NotificationsActiveOutlined';
import { DuncitRoundButton } from '@duncit/buttons';
import { CHAT_MUTE_DURATIONS, chatMuteCopy, type ChatMuteDuration } from '@duncit/utils';
import { HEADER_BUTTON_SX } from '../../pages/support-chat/calmStyles';
import { useTranslation } from '../../i18n/useTranslation';
import { formatDateTime } from '../../utils/dateFormat';

interface Props {
  muted: boolean;
  /** ISO end of a timed mute; null while muted means Always. */
  mutedUntil: string | null;
  busy?: boolean;
  onChoose: (duration: ChatMuteDuration | null) => void;
}

/**
 * The bell at the top of a pod's, club's or support chat. The icon itself is
 * the muted state (bell vs bell-off, with when it ends on hover and to screen
 * readers); the menu offers 8 hours, 1 week, Always and Unmute.
 */
export default function ChatMuteMenu({ muted, mutedUntil, busy = false, onChoose }: Readonly<Props>) {
  const { t } = useTranslation();
  const copy = chatMuteCopy(t);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const menuId = useId();
  const until = mutedUntil ? t('mweb.chatRoom.mute.mutedUntil', { vars: { date: formatDateTime(mutedUntil) } }) : null;
  const label = muted ? `${copy.mutedLabel}${until ? `. ${until}` : ''}` : copy.menuLabel;

  const pick = (duration: ChatMuteDuration | null) => () => {
    setAnchor(null);
    onChoose(duration);
  };

  return (
    <>
      <Tooltip title={label} describeChild>
        <DuncitRoundButton
          data-testid="chat-mute-toggle"
          aria-label={muted ? copy.mutedLabel : copy.menuLabel}
          aria-haspopup="menu"
          aria-expanded={anchor ? 'true' : undefined}
          aria-controls={anchor ? menuId : undefined}
          disabled={busy}
          onClick={(e) => setAnchor(e.currentTarget)}
          sx={HEADER_BUTTON_SX}
        >
          {muted ? <NotificationsOffOutlinedIcon /> : <NotificationsNoneOutlinedIcon />}
        </DuncitRoundButton>
      </Tooltip>
      <Menu id={menuId} anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)} data-testid="chat-mute-menu">
        {CHAT_MUTE_DURATIONS.map((duration) => (
          <MenuItem key={duration} onClick={pick(duration)} data-testid={`chat-mute-${duration}`}>
            <ListItemText primary={copy.options[duration]} />
          </MenuItem>
        ))}
        {muted && (
          <MenuItem onClick={pick(null)} data-testid="chat-mute-unmute">
            <ListItemIcon>
              <NotificationsActiveOutlinedIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary={copy.unmute} secondary={until} />
          </MenuItem>
        )}
      </Menu>
    </>
  );
}
