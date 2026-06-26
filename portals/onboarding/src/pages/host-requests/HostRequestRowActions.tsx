import { useState } from 'react';
import { IconButton, ListItemText, Menu, MenuItem, Typography } from '@mui/material';
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
}

interface Props extends Handlers {
  request: HostRequest;
  busy: boolean;
}

/** Status-driven action list. Terminal (APPROVED/REJECTED) requests get no actions. */
function buildActions(request: HostRequest, h: Handlers): Action[] {
  if (request.status === 'REQUESTED') {
    return [{ label: 'Acknowledge', onClick: () => h.onAcknowledge(request) }];
  }
  if (request.status === 'ACKNOWLEDGED') {
    return [
      { label: 'Approve', onClick: () => h.onApprove(request) },
      { label: 'Reject', onClick: () => h.onReject(request), danger: true },
    ];
  }
  return [];
}

/** Actions dropdown on a host-request row — options change with the request status. */
export default function HostRequestRowActions({ request, busy, onAcknowledge, onApprove, onReject }: Readonly<Props>) {
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  const actions = buildActions(request, { onAcknowledge, onApprove, onReject });
  if (actions.length === 0) {
    return <Typography variant="caption" color="text.secondary">—</Typography>;
  }
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
