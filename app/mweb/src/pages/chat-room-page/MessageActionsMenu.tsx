import { ListItemIcon, ListItemText, Menu, MenuItem } from '@mui/material';
import AddReactionOutlinedIcon from '@mui/icons-material/AddReactionOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined';
import FlagOutlinedIcon from '@mui/icons-material/FlagOutlined';
import { useTranslation } from '../../i18n/useTranslation';

export interface MessageActionsTarget {
  el: HTMLElement;
  id: string;
  mine: boolean;
}

interface Props {
  target: MessageActionsTarget | null;
  /** The viewer runs this room (a club admin, a pod host). */
  canModerate: boolean;
  onClose: () => void;
  onReact: (el: HTMLElement, id: string) => void;
  onDelete: (id: string) => void;
  onReport: (id: string) => void;
}

/**
 * What can be done to one message: react to it, delete it (your own, or
 * anyone's in a room you moderate) and report it (anyone's but your own).
 * The server is the gate for both — this only decides what is offered.
 */
export default function MessageActionsMenu({
  target,
  canModerate,
  onClose,
  onReact,
  onDelete,
  onReport,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const pick = (run: (target: MessageActionsTarget) => void) => () => {
    if (target) run(target);
    onClose();
  };
  return (
    <Menu
      open={!!target}
      anchorEl={target?.el ?? null}
      onClose={onClose}
      data-testid="chat-message-actions"
    >
      <MenuItem onClick={pick((m) => onReact(m.el, m.id))} data-testid="chat-message-action-react">
        <ListItemIcon>
          <AddReactionOutlinedIcon fontSize="small" />
        </ListItemIcon>
        <ListItemText primary={t('mweb.chatRoom.react')} />
      </MenuItem>
      {target && (target.mine || canModerate) && (
        <MenuItem onClick={pick((m) => onDelete(m.id))} data-testid="chat-message-action-delete">
          <ListItemIcon>
            <DeleteOutlineIcon fontSize="small" color="error" />
          </ListItemIcon>
          <ListItemText primary={t('mweb.chatRoom.deleteMessage')} />
        </MenuItem>
      )}
      {target && !target.mine && (
        <MenuItem onClick={pick((m) => onReport(m.id))} data-testid="chat-message-action-report">
          <ListItemIcon>
            <FlagOutlinedIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText primary={t('mweb.chatRoom.reportMessage')} />
        </MenuItem>
      )}
    </Menu>
  );
}
