import { useState } from 'react';
import { IconButton, ListItemText, Menu, MenuItem, Typography } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import type { OnboardingMeeting } from './queries';
import { useTranslation } from '@duncit/app-settings';

type Translate = ReturnType<typeof useTranslation>['t'];

interface Action {
  label: string;
  onClick: () => void;
  danger?: boolean;
}

interface Handlers {
  onSchedule: (m: OnboardingMeeting) => void;
  onMarkDone: (m: OnboardingMeeting) => void;
  onDecide: (m: OnboardingMeeting) => void;
  onReject: (m: OnboardingMeeting) => void;
}

interface Props extends Handlers {
  meeting: OnboardingMeeting;
}

/** Status-driven action list. Cancelled or denied meetings get no actions. */
function buildActions(meeting: OnboardingMeeting, h: Handlers, t: Translate): Action[] {
  const approval = meeting.approval_status ?? 'NONE';
  if (approval === 'DENIED' || meeting.status === 'CANCELLED') return [];
  if (meeting.status === 'REQUESTED') {
    return [
      { label: t('onboarding.meetings.schedule'), onClick: () => h.onSchedule(meeting) },
      { label: t('shell.common.cancel'), onClick: () => h.onReject(meeting), danger: true },
    ];
  }
  if (meeting.status === 'SCHEDULED') {
    return [
      { label: t('onboarding.meetings.reschedule'), onClick: () => h.onSchedule(meeting) },
      { label: t('onboarding.meetings.markDone'), onClick: () => h.onMarkDone(meeting) },
      { label: t('onboarding.common.reject'), onClick: () => h.onReject(meeting), danger: true },
    ];
  }
  if (meeting.status === 'DONE' && approval === 'NONE') {
    return [{ label: t('onboarding.meetings.approveDeny'), onClick: () => h.onDecide(meeting) }];
  }
  return [];
}

/** Actions dropdown on a meeting row — options change with the meeting status. */
export default function MeetingRowActions({ meeting, onSchedule, onMarkDone, onDecide, onReject }: Readonly<Props>) {
  const { t } = useTranslation();
  const [anchor, setAnchor] = useState<null | HTMLElement>(null);
  const actions = buildActions(meeting, { onSchedule, onMarkDone, onDecide, onReject }, t);
  if (actions.length === 0) {
    return (
      <Typography variant="caption" sx={{
        color: "text.secondary"
      }}>—</Typography>
    );
  }
  const run = (action: Action) => {
    setAnchor(null);
    action.onClick();
  };
  return (
    <>
      <IconButton size="small" onClick={(e) => setAnchor(e.currentTarget)} aria-label={t('onboarding.meetings.meetingActions')}>
        <MoreVertIcon fontSize="small" />
      </IconButton>
      <Menu anchorEl={anchor} open={!!anchor} onClose={() => setAnchor(null)}>
        {actions.map((action) => (
          <MenuItem key={action.label} onClick={() => run(action)}>
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
