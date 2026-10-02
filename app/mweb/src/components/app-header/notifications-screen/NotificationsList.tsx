import type { ComponentProps } from 'react';
import { Paper } from '@mui/material';
import NotificationRow from './NotificationRow';
import { SURFACE_SX } from '../../../theme';

type NotificationItem = ComponentProps<typeof NotificationRow>['item'];

interface NotificationsListProps {
  visible: NotificationItem[];
  busyId: string | null;
  markAllBusy: boolean;
  onNotifClick: (n: NotificationItem) => void;
  onRefresh?: () => void;
}

/** The filtered inbox, one hairline-separated row per notification. */
export default function NotificationsList({
  visible,
  busyId,
  markAllBusy,
  onNotifClick,
  onRefresh,
}: Readonly<NotificationsListProps>) {
  return (
    <Paper
      data-testid="notifications-list"
      sx={{
        ...SURFACE_SX,
        overflow: 'hidden',
        // Hairlines between rows, drawn by the list (rows stay self-contained).
        '& > * + *': { borderTop: 1, borderColor: 'divider' },
      }}
    >
      {visible.map((item: NotificationItem) => (
        <NotificationRow
          key={item.id}
          item={item}
          busy={busyId === item.id || markAllBusy}
          onClick={() => onNotifClick(item)}
          onAnswered={onRefresh}
        />
      ))}
    </Paper>
  );
}
