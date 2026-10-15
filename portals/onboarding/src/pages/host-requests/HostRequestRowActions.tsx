import { useState } from 'react';
import { ListItemText, Menu, MenuItem } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { DuncitIconButton } from '@duncit/buttons';
import type { HostRequest } from './queries';
import { useTranslation } from '@duncit/app-settings';

type Translate = ReturnType<typeof useTranslation>['t'];

interface Action {
  /** The menu item's test id suffix: `host-request-action-<testId>`. */
  testId: string;
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
function buildActions(request: HostRequest, h: Handlers, t: Translate): Action[] {
  const actions: Action[] = [];
  if (request.status === 'REQUESTED') {
    actions.push({ testId: 'acknowledge', label: t('onboarding.hostRequests.acknowledge'), onClick: () => h.onAcknowledge(request) });
  } else if (request.status === 'ACKNOWLEDGED') {
    actions.push(
      { testId: 'approve', label: t('onboarding.hostRequests.approve'), onClick: () => h.onApprove(request) },
      { testId: 'reject', label: t('onboarding.common.reject'), onClick: () => h.onReject(request), danger: true },
    );
  }
  actions.push({ testId: 'delete', label: t('shell.common.delete'), onClick: () => h.onDelete(request), danger: true });
  return actions;
}

/** Actions dropdown on a host-request row — options change with the request status. */
export default function HostRequestRowActions({ request, busy, onAcknowledge, onApprove, onReject, onDelete }: Readonly<Props>) {
  const { t } = useTranslation();
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  const actions = buildActions(request, { onAcknowledge, onApprove, onReject, onDelete }, t);
  const run = (action: Action) => {
    setAnchor(null);
    action.onClick();
  };
  return (
    <>
      <DuncitIconButton size="small" disabled={busy} onClick={(e) => setAnchor(e.currentTarget)} aria-label={t('onboarding.hostRequests.hostRequestActions')} aria-haspopup="menu" aria-expanded={!!anchor} data-testid={`host-request-actions-${request.id}`}>
        <MoreVertIcon fontSize="small" />
      </DuncitIconButton>
      <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}>
        {actions.map((action) => (
          <MenuItem key={action.label} onClick={() => run(action)} data-testid={`host-request-action-${action.testId}`}>
            <ListItemText
              primary={action.label}
              slotProps={{
                primary: action.danger ? { color: 'error' } : undefined
              }}
            />
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}
