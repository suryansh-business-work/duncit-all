import { useState } from 'react';
import { IconButton, ListItemText, Menu, MenuItem, Typography } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import type { OnboardingMeeting } from './queries';

interface Action {
  label: string;
  onClick: () => void;
  danger?: boolean;
}

interface Handlers {
  onSchedule: (m: OnboardingMeeting) => void;
  onMarkDone: (m: OnboardingMeeting) => void;
  onSendFeedback: (m: OnboardingMeeting) => void;
  onReject: (m: OnboardingMeeting) => void;
}

interface Props extends Handlers {
  meeting: OnboardingMeeting;
  marking: boolean;
}

/** Status-driven action list. Cancelled or admin-denied meetings get no actions. */
function buildActions(meeting: OnboardingMeeting, h: Handlers): Action[] {
  const approval = meeting.approval_status ?? 'NONE';
  if (approval === 'DENIED' || meeting.status === 'CANCELLED') return [];
  if (meeting.status === 'REQUESTED') {
    return [
      { label: 'Schedule', onClick: () => h.onSchedule(meeting) },
      { label: 'Cancel', onClick: () => h.onReject(meeting), danger: true },
    ];
  }
  if (meeting.status === 'SCHEDULED') {
    return [
      { label: 'Reschedule', onClick: () => h.onSchedule(meeting) },
      { label: 'Mark done', onClick: () => h.onMarkDone(meeting) },
      { label: 'Reject', onClick: () => h.onReject(meeting), danger: true },
    ];
  }
  if (meeting.status === 'DONE' && approval === 'NONE') {
    return [{ label: 'Send feedback', onClick: () => h.onSendFeedback(meeting) }];
  }
  return [];
}

/** Actions dropdown on a meeting row — options change with the meeting status. */
export default function MeetingRowActions({ meeting, marking, onSchedule, onMarkDone, onSendFeedback, onReject }: Readonly<Props>) {
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  const actions = buildActions(meeting, { onSchedule, onMarkDone, onSendFeedback, onReject });
  if (actions.length === 0) {
    return <Typography variant="caption" color="text.secondary">—</Typography>;
  }
  const run = (action: Action) => {
    setAnchor(null);
    action.onClick();
  };
  return (
    <>
      <IconButton size="small" disabled={marking} onClick={(e) => setAnchor(e.currentTarget)} aria-label="Meeting actions">
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
