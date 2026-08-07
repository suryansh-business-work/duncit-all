import { useState } from 'react';
import { Divider, IconButton, ListItemIcon, ListItemText, Menu, MenuItem, Tooltip } from '@mui/material';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import ReplyIcon from '@mui/icons-material/Reply';
import ForwardIcon from '@mui/icons-material/Forward';
import PushPinIcon from '@mui/icons-material/PushPin';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ChecklistIcon from '@mui/icons-material/Checklist';
import HistoryIcon from '@mui/icons-material/History';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import type { StaffMessage } from './queries';

interface Props {
  message: StaffMessage;
  /** Only your own words can be changed or taken back. */
  mine: boolean;
  onReply: () => void;
  onForward: () => void;
  onPin: () => void;
  onCopy: () => void;
  /** Turn on selection mode, with this message already picked. */
  onStartSelect: () => void;
  /** Absent unless the reader may see earlier wordings of this message. */
  onEditHistory?: () => void;
  onEdit: () => void;
  /** True deletes it for both people; false only hides it for you. */
  onDelete: (forEveryone: boolean) => void;
}

/**
 * Everything you can do to one message, behind one button.
 *
 * A menu rather than a row of icons: there are seven of these and a bubble with
 * seven controls on it is a toolbar with a sentence in it. Reply and copy are
 * the two people reach for, so they sit at the top.
 */
export default function MessageActions({
  message,
  mine,
  onReply,
  onForward,
  onPin,
  onCopy,
  onStartSelect,
  onEditHistory,
  onEdit,
  onDelete,
}: Readonly<Props>) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const close = () => setAnchor(null);
  const run = (action: () => void) => () => {
    action();
    close();
  };

  return (
    <>
      <Tooltip title="More">
        <IconButton
          size="small"
          color="inherit"
          aria-label="Message actions"
          onClick={(event) => setAnchor(event.currentTarget)}
        >
          <MoreHorizIcon sx={{ fontSize: 15 }} />
        </IconButton>
      </Tooltip>
      <Menu anchorEl={anchor} open={Boolean(anchor)} onClose={close}>
        <MenuItem onClick={run(onReply)}>
          <ListItemIcon>
            <ReplyIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Reply</ListItemText>
        </MenuItem>
        <MenuItem onClick={run(onCopy)}>
          <ListItemIcon>
            <ContentCopyIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Copy text</ListItemText>
        </MenuItem>
        <MenuItem onClick={run(onStartSelect)}>
          <ListItemIcon>
            <ChecklistIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Select messages</ListItemText>
        </MenuItem>
        <MenuItem onClick={run(onForward)}>
          <ListItemIcon>
            <ForwardIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Forward</ListItemText>
        </MenuItem>
        <MenuItem onClick={run(onPin)}>
          <ListItemIcon>
            {message.pinned_at ? (
              <PushPinIcon fontSize="small" color="primary" />
            ) : (
              <PushPinOutlinedIcon fontSize="small" />
            )}
          </ListItemIcon>
          <ListItemText>{message.pinned_at ? 'Unpin' : 'Pin'}</ListItemText>
        </MenuItem>
        {/* Only where there IS a history, and only for someone allowed to
            read it — an empty dialog is a worse answer than no menu item. */}
        {onEditHistory && message.edited_at && (
          <MenuItem onClick={run(onEditHistory)}>
            <ListItemIcon>
              <HistoryIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Edit history</ListItemText>
          </MenuItem>
        )}
        {mine && (
          <MenuItem onClick={run(onEdit)}>
            <ListItemIcon>
              <EditIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Edit</ListItemText>
          </MenuItem>
        )}

        {/*
          Two deletes, because they are two different promises. "For me" hides
          it from this device and leaves the other person's copy alone — the
          honest thing, since their screen is not ours to reach into. "For
          everyone" is only offered on your own words, because taking back
          somebody else's is not a delete, it is an edit of what they said.
        */}
        <Divider />
        <MenuItem onClick={run(() => onDelete(false))}>
          <ListItemIcon>
            <DeleteOutlineIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText>Delete for me</ListItemText>
        </MenuItem>
        {mine && (
          <MenuItem onClick={run(() => onDelete(true))}>
            <ListItemIcon>
              <DeleteForeverIcon fontSize="small" color="error" />
            </ListItemIcon>
            <ListItemText primaryTypographyProps={{ color: 'error' }}>
              Delete for everyone
            </ListItemText>
          </MenuItem>
        )}
      </Menu>
    </>
  );
}
