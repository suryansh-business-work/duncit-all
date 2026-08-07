import { useState } from 'react';
import { IconButton, ListItemIcon, ListItemText, Menu, MenuItem, Tooltip } from '@mui/material';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import ReplyIcon from '@mui/icons-material/Reply';
import ForwardIcon from '@mui/icons-material/Forward';
import PushPinIcon from '@mui/icons-material/PushPin';
import PushPinOutlinedIcon from '@mui/icons-material/PushPinOutlined';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import type { StaffMessage } from './queries';

interface Props {
  message: StaffMessage;
  /** Only your own words can be changed or taken back. */
  mine: boolean;
  onReply: () => void;
  onForward: () => void;
  onPin: () => void;
  onCopy: () => void;
  onEdit: () => void;
  onDelete: () => void;
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
        {mine && (
          <MenuItem onClick={run(onEdit)}>
            <ListItemIcon>
              <EditIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Edit</ListItemText>
          </MenuItem>
        )}
        {mine && (
          <MenuItem onClick={run(onDelete)}>
            <ListItemIcon>
              <DeleteOutlineIcon fontSize="small" color="error" />
            </ListItemIcon>
            <ListItemText primaryTypographyProps={{ color: 'error' }}>Delete</ListItemText>
          </MenuItem>
        )}
      </Menu>
    </>
  );
}
