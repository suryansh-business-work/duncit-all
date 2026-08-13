import { Stack, Typography } from '@mui/material';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import { useTranslation } from '@duncit/app-settings';
import { DuncitDashboard, type DashboardWidget } from '@duncit/dashboard';
import BoardStatsCards from './BoardStatsCards';
import BoardViewer from './BoardViewer';

/** Admin > Leaderboard > Boards — headline stats per board plus a live board viewer. */
export default function LeaderboardBoardsPage() {
  const { t } = useTranslation();

  const widgets: DashboardWidget[] = [
    {
      id: 'board-stats',
      bare: true,
      defaultLayout: { x: 0, y: 0, w: 12, h: 3 },
      minH: 2,
      content: <BoardStatsCards />,
    },
    {
      id: 'board-viewer',
      bare: true,
      defaultLayout: { x: 0, y: 3, w: 12, h: 9 },
      minW: 4,
      minH: 5,
      content: <BoardViewer />,
    },
  ];

  return (
    <DuncitDashboard
      dashboardId="challenge.leaderboardBoards"
      header={
        <Stack direction="row" alignItems="center" spacing={1}>
          <EmojiEventsIcon color="primary" />
          <Stack>
            <Typography variant="h5" fontWeight={700}>
              {t('admin.leaderboard.boardsTitle')}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {t('admin.leaderboard.boardsSubtitle')}
            </Typography>
          </Stack>
        </Stack>
      }
      widgets={widgets}
    />
  );
}
