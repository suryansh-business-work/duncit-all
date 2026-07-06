import { useState } from 'react';
import { IconButton, ListItemText, Menu, MenuItem } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import type { HostRequest } from './queries';

interface Action {
  label: string;
  onClick: () => void;
  danger?: boolean;
}

interface Handlers {
  onAcknowledge: (r: HostRequest) => void;
  onApprove: (r: HostRequest) => void;
  onReject: (r: HostRequest) => void;
  onDelete: (r: HostRequest) => void;
}

interface Props extends Handlers {
  request: HostRequest;
  busy: boolean;
}

/** Status-driven action list. Delete is always available; approve/reject/ack
 * depend on the request status. */
function buildActions(request: HostRequest, h: Handlers): Action[] {
  const actions: Action[] = [];
  if (request.status === 'REQUESTED') {
    actions.push({ label: 'Acknowledge', onClick: () => h.onAcknowledge(request) });
  } else if (request.status === 'ACKNOWLEDGED') {
    actions.push(
      { label: 'Approve', onClick: () => h.onApprove(request) },
      { label: 'Reject', onClick: () => h.onReject(request), danger: true },
    );
  }
  actions.push({ label: 'Delete', onClick: () => h.onDelete(request), danger: true });
  return actions;
}

/** Actions dropdown on a host-request row — options change with the request status. */
export default function HostRequestRowActions({ request, busy, onAcknowledge, onApprove, onReject, onDelete }: Readonly<Props>) {
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  const actions = buildActions(request, { onAcknowledge, onApprove, onReject, onDelete });
  const run = (action: Action) => {
    setAnchor(null);
    action.onClick();
  };
  return (
    <>
      <IconButton size="small" disabled={busy} onClick={(e) => setAnchor(e.currentTarget)} aria-label="Host request actions">
        <MoreVertIcon fontSize="small" />
      </IconButton>
      <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}>
        {actions.map((action) => (
          <MenuItem key={action.label} onClick={() => run(action)}>
            <ListItemText
              primary={action.label}
              primaryTypographyProps={action.danger ? { color: 'error' } : undefined}
            />
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
